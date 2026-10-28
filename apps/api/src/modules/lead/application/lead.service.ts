import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CountryCode,
  InterestType,
  Lead,
  LeadChannel,
  LeadStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { PhoneNormalizerService } from '../domain/phone-normalizer.service';
import { ArabicNameNormalizer } from '../domain/arabic-name.service';
import { LeadDeduplicatorService, DedupCandidate } from '../domain/lead-deduplicator.service';
import { DistributionEngine } from '../domain/distribution.engine';
import { LeadScorerService } from '../domain/lead-scorer.service';

export interface CreateLeadInput {
  fullName: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  sourceCode?: string;
  channel?: LeadChannel;
  interestType?: InterestType;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  preferredAreas?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  notes?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrerUrl?: string;
  externalId?: string;
  rawPayload?: unknown;
  branchId?: string;
  assignedToId?: string; // pre-assigned (e.g., agent walk-in)
  autoAssign?: boolean; // default true
  tags?: string[];
}

export interface CreateLeadResult {
  id: string;
  duplicate: boolean;
  duplicateCandidates: DedupCandidate[];
  assignedToId?: string | null;
  score: number;
}

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly phone: PhoneNormalizerService,
    private readonly arabicName: ArabicNameNormalizer,
    private readonly dedup: LeadDeduplicatorService,
    private readonly distribution: DistributionEngine,
    private readonly scorer: LeadScorerService,
  ) {}

  // ---------------------------------------------------------------------------
  // Capture — unified entry point for manual + webhook + import
  // ---------------------------------------------------------------------------
  async capture(tenantId: string, input: CreateLeadInput): Promise<CreateLeadResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (!input.fullName?.trim()) {
      throw new BadRequestException('Full name is required');
    }
    if (!input.phone && !input.email) {
      throw new BadRequestException('At least phone or email is required');
    }

    // 1. Normalize identifiers ----------------------------------------------
    const phoneNormalized = this.phone.normalize(input.phone, tenant.country);
    const emailLower = input.email?.trim().toLowerCase() ?? null;
    const nameNormalized = this.arabicName.normalize(input.fullName);

    // 2. Dedup check ---------------------------------------------------------
    const candidates = await this.dedup.findCandidates(tenantId, {
      phoneNormalized,
      emailLower,
      nationalId: input.nationalId ?? null,
    });
    const isDuplicate = candidates.some((c) => c.confidence >= 0.95);

    // 3. Resolve source ------------------------------------------------------
    let sourceId: string | null = null;
    let sourceChannel: LeadChannel = input.channel ?? LeadChannel.MANUAL;
    if (input.sourceCode) {
      const source = await this.prisma.leadSource.findFirst({
        where: { tenantId, code: input.sourceCode },
      });
      if (source) {
        sourceId = source.id;
        sourceChannel = source.channel;
      }
    }

    // 4. Distribute ----------------------------------------------------------
    let assignedToId: string | null = input.assignedToId ?? null;
    let ruleId: string | undefined;
    if (!assignedToId && input.autoAssign !== false) {
      const decision = await this.distribution.pickAssignee({
        tenantId,
        branchId: input.branchId,
        sourceCode: input.sourceCode,
      });
      assignedToId = decision?.assigneeId ?? null;
      ruleId = decision?.ruleId;
    }

    // 5. Score ---------------------------------------------------------------
    const { score, urgency } = this.scorer.scoreLead({
      phone: input.phone ?? null,
      email: input.email ?? null,
      budgetMax: input.budgetMax ? new Prisma.Decimal(input.budgetMax) : null,
      interestType: input.interestType ?? null,
      sourceChannel: sourceChannel,
      recentActivityCount: 0,
    });

    // 6. Persist + assignment audit + outbox in one transaction --------------
    const result = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          tenantId,
          branchId: input.branchId,
          sourceId,
          fullName: input.fullName.trim(),
          phone: input.phone,
          phoneNormalized,
          email: input.email,
          emailLower,
          nationalId: input.nationalId,
          status: LeadStatus.NEW,
          channel: sourceChannel,
          assignedToId,
          assignedAt: assignedToId ? new Date() : null,
          slaDueAt: assignedToId ? new Date(Date.now() + 30 * 60_000) : null, // 30min default SLA
          interestType: input.interestType,
          budgetMin: input.budgetMin ? new Prisma.Decimal(input.budgetMin) : null,
          budgetMax: input.budgetMax ? new Prisma.Decimal(input.budgetMax) : null,
          currency: input.currency,
          preferredAreas: input.preferredAreas ?? [],
          propertyTypes: input.propertyTypes ?? [],
          bedroomsMin: input.bedroomsMin,
          notes: input.notes,
          score,
          urgency,
          utmSource: input.utm?.source,
          utmMedium: input.utm?.medium,
          utmCampaign: input.utm?.campaign,
          utmTerm: input.utm?.term,
          utmContent: input.utm?.content,
          referrerUrl: input.referrerUrl,
          externalId: input.externalId,
          rawPayload: (input.rawPayload ?? null) as Prisma.InputJsonValue,
          tags: input.tags ?? [],
        },
      });

      if (assignedToId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            toUserId: assignedToId,
            ruleId,
            reason: 'initial_assignment',
          },
        });
      }

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'lead.captured',
        aggregateType: 'lead',
        aggregateId: lead.id,
        payload: {
          leadId: lead.id,
          sourceChannel,
          assignedToId,
          score,
          urgency,
          duplicate: isDuplicate,
        },
      });

      if (assignedToId) {
        await this.outbox.append(tx, {
          tenantId,
          eventType: 'lead.assigned',
          aggregateType: 'lead',
          aggregateId: lead.id,
          payload: { leadId: lead.id, assignedToId, ruleId },
        });
      }

      return lead;
    });

    await this.audit.record({
      action: 'lead.created',
      tenantId,
      resourceType: 'lead',
      resourceId: result.id,
      afterValue: { phone: phoneNormalized, email: emailLower, sourceCode: input.sourceCode },
    });

    return {
      id: result.id,
      duplicate: isDuplicate,
      duplicateCandidates: candidates,
      assignedToId,
      score,
    };
  }

  /** Standalone capture from a controller context (uses CLS tenant id). */
  async captureForCurrentTenant(input: CreateLeadInput): Promise<CreateLeadResult> {
    return this.capture(this.ctx.requireTenantId(), input);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  async findById(id: string): Promise<unknown> {
    const tenantId = this.ctx.requireTenantId();
    // Agents holding only `lead:read.own` can fetch the record only if it is
    // assigned to them. Managers/Admins with the broader `lead:read` see any.
    const canReadAny = this.ctx.hasPermission('lead:read');
    const ownerScope = !canReadAny ? { assignedToId: this.ctx.userId } : {};
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...ownerScope },
      include: {
        source: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        contact: true,
        branch: true,
        activities: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        assignmentLog: {
          take: 20,
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async search(opts: {
    status?: LeadStatus;
    assignedToId?: string;
    sourceId?: string;
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<{ items: Lead[]; total: number }> {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      tenantId,
      deletedAt: null,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.assignedToId ? { assignedToId: opts.assignedToId } : {}),
      ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
      ...(opts.q
        ? {
            OR: [
              { fullName: { contains: opts.q, mode: 'insensitive' } },
              { phoneNormalized: { contains: opts.q } },
              { emailLower: { contains: opts.q.toLowerCase() } },
              { nationalId: { contains: opts.q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
        include: {
          source: { select: { code: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items: items as Lead[], total };
  }

  async myInbox(opts: { page?: number; limit?: number; status?: LeadStatus }): Promise<{ items: Lead[]; total: number }> {
    const userId = this.ctx.userId;
    if (!userId) throw new BadRequestException('No user in context');
    return this.search({ ...opts, assignedToId: userId });
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  async changeStatus(id: string, next: LeadStatus, opts?: { lostReason?: string; notes?: string }): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    const data: Prisma.LeadUpdateInput = { status: next };
    if (next === LeadStatus.QUALIFIED) data.qualifiedAt = new Date();
    if (next === LeadStatus.WON) data.wonAt = new Date();
    if (next === LeadStatus.LOST) {
      data.lostAt = new Date();
      if (opts?.lostReason) data.lostReason = opts.lostReason;
    }
    if (lead.status === LeadStatus.NEW && next !== LeadStatus.NEW) {
      data.firstContactedAt = new Date();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'lead.status_changed',
        aggregateType: 'lead',
        aggregateId: id,
        payload: { oldStatus: lead.status, newStatus: next },
      });
    });

    await this.audit.record({
      action: 'lead.status_changed',
      resourceType: 'lead',
      resourceId: id,
      beforeValue: { status: lead.status },
      afterValue: { status: next, ...(opts?.lostReason ? { lostReason: opts.lostReason } : {}) },
    });
  }

  async assign(id: string, toUserId: string, reason = 'manual_reassignment'): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          assignedToId: toUserId,
          assignedAt: new Date(),
          slaDueAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await tx.leadAssignment.create({
        data: {
          leadId: id,
          fromUserId: lead.assignedToId,
          toUserId,
          reason,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'lead.reassigned',
        aggregateType: 'lead',
        aggregateId: id,
        payload: { fromUserId: lead.assignedToId, toUserId, reason },
      });
    });

    await this.audit.record({
      action: 'lead.assigned',
      resourceType: 'lead',
      resourceId: id,
      beforeValue: { assignedToId: lead.assignedToId },
      afterValue: { assignedToId: toUserId, reason },
    });
  }

  async convertToContact(id: string): Promise<{ contactId: string }> {
    const tenantId = this.ctx.requireTenantId();
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.contactId) return { contactId: lead.contactId };

    // Lazy-import to avoid a circular dependency at module init time
    const nameNormalized = this.arabicName.normalize(lead.fullName);

    const result = await this.prisma.$transaction(async (tx) => {
      // Find an existing contact by phone/email first to avoid duplicates
      const existing = await tx.contact.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            lead.phoneNormalized ? { phoneNormalized: lead.phoneNormalized } : undefined,
            lead.emailLower ? { emailLower: lead.emailLower } : undefined,
            lead.nationalId ? { nationalId: lead.nationalId } : undefined,
          ].filter(Boolean) as Prisma.ContactWhereInput[],
        },
      });

      let contactId: string;
      if (existing) {
        await tx.contact.update({
          where: { id: existing.id },
          data: { isBuyer: existing.isBuyer || lead.interestType === 'BUY' },
        });
        contactId = existing.id;
      } else {
        const contact = await tx.contact.create({
          data: {
            tenantId,
            fullName: lead.fullName,
            fullNameNormalized: nameNormalized,
            phone: lead.phone,
            phoneNormalized: lead.phoneNormalized,
            email: lead.email,
            emailLower: lead.emailLower,
            nationalId: lead.nationalId,
            isBuyer: lead.interestType === 'BUY' || lead.interestType === 'INVEST',
            isSeller: lead.interestType === 'SELL',
            isTenant: lead.interestType === 'RENT',
            isLandlord: lead.interestType === 'RENT_OUT',
            isInvestor: lead.interestType === 'INVEST',
            preferredChannel: 'whatsapp',
          },
        });
        contactId = contact.id;
      }

      await tx.lead.update({ where: { id }, data: { contactId } });

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'lead.converted_to_contact',
        aggregateType: 'lead',
        aggregateId: id,
        payload: { leadId: id, contactId },
      });

      return { contactId };
    });

    return result;
  }
}
