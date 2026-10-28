import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CountryCode, PlanCode, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PasswordService } from '../../iam/domain/password.service';
import { BUILTIN_ROLES } from '../../iam/domain/permissions.catalog';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

interface SignupInput {
  tenantName: string;
  subdomain: string;
  country: CountryCode;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;
  locale?: string;
  timezone?: string;
}

interface SignupResult {
  tenantId: string;
  branchId: string;
  ownerId: string;
}

const TRIAL_DAYS = 14;

const SUBDOMAIN_REGEX = /^[a-z][a-z0-9-]{2,29}$/;

// Reserved subdomains we can never give to tenants
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'docs', 'admin', 'auth', 'partners', 'help',
  'status', 'billing', 'mail', 'developers', 'blog', 'support',
]);

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly ctx: TenantContextService,
  ) {}

  // ---------------------------------------------------------------------------
  // Self-service signup: creates Tenant + default Branch + default Roles + Owner
  // ---------------------------------------------------------------------------
  async signup(input: SignupInput): Promise<SignupResult> {
    const subdomain = input.subdomain.trim().toLowerCase();
    if (!SUBDOMAIN_REGEX.test(subdomain)) {
      throw new BadRequestException(
        'Subdomain must start with a letter and contain 3-30 lowercase letters, digits, or hyphens',
      );
    }
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      throw new ConflictException('Subdomain is reserved');
    }

    const taken = await this.prisma.tenant.findUnique({ where: { subdomain } });
    if (taken) throw new ConflictException('Subdomain already taken');

    const passwordIssue = this.passwords.validatePolicy(input.ownerPassword);
    if (passwordIssue) throw new BadRequestException(passwordIssue);

    const passwordHash = await this.passwords.hash(input.ownerPassword);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Tenant defaults derived from country
    const defaults = this.deriveCountryDefaults(input.country, input.locale, input.timezone);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          subdomain,
          name: input.tenantName,
          country: input.country,
          currency: defaults.currency,
          locale: defaults.locale,
          timezone: defaults.timezone,
          planCode: PlanCode.FREE,
          status: TenantStatus.TRIALING,
          trialEndsAt,
          hijriEnabled: input.country === CountryCode.SA,
        },
      });

      // 2. Seed built-in roles for this tenant (gives them the flexibility to
      //    customise role permissions per-tenant later without touching the
      //    global catalog).
      const rolesData: Prisma.RoleCreateManyInput[] = Object.values(BUILTIN_ROLES).map((r) => ({
        tenantId: tenant.id,
        code: r.code,
        name: r.name,
        permissions: [...r.permissions],
        isSystem: true,
        isDefault: r.code === 'AGENT',
      }));
      await tx.role.createMany({ data: rolesData });

      const ownerRole = await tx.role.findFirst({
        where: { tenantId: tenant.id, code: 'OWNER' },
      });

      // 3. Default branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${input.tenantName} HQ`,
          code: 'HQ',
          country: input.country,
          isDefault: true,
          timezone: defaults.timezone,
        },
      });

      // 4. Owner user
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail.trim().toLowerCase(),
          passwordHash,
          firstName: input.ownerFirstName,
          lastName: input.ownerLastName,
          phone: input.ownerPhone,
          status: 'ACTIVE',
          emailVerifiedAt: null,
          locale: defaults.locale,
          timezone: defaults.timezone,
          roles: ownerRole ? { create: [{ roleId: ownerRole.id }] } : undefined,
          branches: { create: [{ branchId: branch.id, isPrimary: true }] },
        },
      });

      // 5. Stamp ownership pointer on the tenant
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { ownerId: owner.id },
      });

      // 6. Default pipeline so the deal module is immediately usable
      const pipeline = await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          code: 'SALES',
          name: 'Sales Pipeline',
          pipelineType: 'SALE',
          isDefault: true,
        },
      });
      await tx.pipelineStage.createMany({
        data: [
          { pipelineId: pipeline.id, code: 'PROSPECTING', name: 'Prospecting', sortOrder: 0, probability: 10 },
          { pipelineId: pipeline.id, code: 'QUALIFIED', name: 'Qualified', sortOrder: 1, probability: 25 },
          { pipelineId: pipeline.id, code: 'VIEWING', name: 'Viewing', sortOrder: 2, probability: 40 },
          { pipelineId: pipeline.id, code: 'OFFER', name: 'Offer Sent', sortOrder: 3, probability: 60 },
          { pipelineId: pipeline.id, code: 'NEGOTIATION', name: 'Negotiation', sortOrder: 4, probability: 75 },
          { pipelineId: pipeline.id, code: 'WON', name: 'Won', sortOrder: 5, probability: 100, isWon: true },
          { pipelineId: pipeline.id, code: 'LOST', name: 'Lost', sortOrder: 6, probability: 0, isLost: true },
        ],
      });

      // 7. Default lead source for manual entries
      await tx.leadSource.create({
        data: {
          tenantId: tenant.id,
          code: 'MANUAL',
          name: 'Manual Entry',
          channel: 'MANUAL',
        },
      });

      // 8. Outbox event for downstream consumers (welcome email, analytics, ...)
      await this.outbox.append(tx, {
        tenantId: tenant.id,
        eventType: 'tenant.created',
        aggregateType: 'tenant',
        aggregateId: tenant.id,
        payload: {
          tenantId: tenant.id,
          subdomain: tenant.subdomain,
          ownerId: owner.id,
          ownerEmail: owner.email,
          country: tenant.country,
        },
      });

      return { tenantId: tenant.id, branchId: branch.id, ownerId: owner.id };
    });

    await this.audit.record({
      action: 'tenant.created',
      tenantId: result.tenantId,
      userId: result.ownerId,
      resourceType: 'tenant',
      resourceId: result.tenantId,
    });

    return result;
  }

  async checkSubdomain(subdomain: string): Promise<{ available: boolean; reason?: string }> {
    const lower = subdomain.trim().toLowerCase();
    if (!SUBDOMAIN_REGEX.test(lower)) {
      return { available: false, reason: 'invalid_format' };
    }
    if (RESERVED_SUBDOMAINS.has(lower)) {
      return { available: false, reason: 'reserved' };
    }
    const existing = await this.prisma.tenant.findUnique({ where: { subdomain: lower } });
    return { available: !existing };
  }

  async findCurrent(): Promise<unknown> {
    const id = this.ctx.requireTenantId();
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: { branches: { where: { deletedAt: null } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  // ---------------------------------------------------------------------------
  // Defaults per country
  // ---------------------------------------------------------------------------
  private deriveCountryDefaults(
    country: CountryCode,
    locale?: string,
    timezone?: string,
  ): { currency: string; locale: string; timezone: string } {
    const presets: Record<string, { currency: string; locale: string; timezone: string }> = {
      SA: { currency: 'SAR', locale: 'ar-SA', timezone: 'Asia/Riyadh' },
      AE: { currency: 'AED', locale: 'ar-AE', timezone: 'Asia/Dubai' },
      EG: { currency: 'EGP', locale: 'ar-EG', timezone: 'Africa/Cairo' },
      KW: { currency: 'KWD', locale: 'ar-KW', timezone: 'Asia/Kuwait' },
      QA: { currency: 'QAR', locale: 'ar-QA', timezone: 'Asia/Qatar' },
      BH: { currency: 'BHD', locale: 'ar-BH', timezone: 'Asia/Bahrain' },
      OM: { currency: 'OMR', locale: 'ar-OM', timezone: 'Asia/Muscat' },
      JO: { currency: 'JOD', locale: 'ar-JO', timezone: 'Asia/Amman' },
      MA: { currency: 'MAD', locale: 'ar-MA', timezone: 'Africa/Casablanca' },
      IQ: { currency: 'IQD', locale: 'ar-IQ', timezone: 'Asia/Baghdad' },
      LB: { currency: 'LBP', locale: 'ar-LB', timezone: 'Asia/Beirut' },
    };
    const preset = presets[country] ?? presets.SA;
    return {
      currency: preset.currency,
      locale: locale ?? preset.locale,
      timezone: timezone ?? preset.timezone,
    };
  }
}
