import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { PhoneNormalizerService } from '../../lead/domain/phone-normalizer.service';
import { ArabicNameNormalizer } from '../../lead/domain/arabic-name.service';

interface CreateContactInput {
  fullName: string;
  fullNameAr?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  nationalIdType?: string;
  nationality?: string;
  isBuyer?: boolean;
  isSeller?: boolean;
  isTenant?: boolean;
  isLandlord?: boolean;
  isInvestor?: boolean;
  preferredChannel?: string;
  city?: string;
  district?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly phone: PhoneNormalizerService,
    private readonly arabicName: ArabicNameNormalizer,
  ) {}

  async create(input: CreateContactInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const phoneNormalized = this.phone.normalize(input.phone, tenant.country);
    const emailLower = input.email?.trim().toLowerCase() ?? null;
    const nameNormalized = this.arabicName.normalize(input.fullName);

    // Dedup
    if (input.nationalId) {
      const dup = await this.prisma.contact.findFirst({
        where: { tenantId, nationalId: input.nationalId, deletedAt: null },
      });
      if (dup) throw new ConflictException(`Contact with national ID ${input.nationalId} already exists`);
    }
    if (phoneNormalized) {
      const dup = await this.prisma.contact.findFirst({
        where: { tenantId, phoneNormalized, deletedAt: null },
      });
      if (dup) {
        // Soft-warn: caller may want to merge. We return existing id instead of throwing.
        return dup.id;
      }
    }

    const contact = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          tenantId,
          fullName: input.fullName.trim(),
          fullNameAr: input.fullNameAr,
          fullNameNormalized: nameNormalized,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          phoneNormalized,
          email: input.email,
          emailLower,
          nationalId: input.nationalId,
          nationalIdType: input.nationalIdType,
          nationality: input.nationality,
          isBuyer: input.isBuyer ?? false,
          isSeller: input.isSeller ?? false,
          isTenant: input.isTenant ?? false,
          isLandlord: input.isLandlord ?? false,
          isInvestor: input.isInvestor ?? false,
          preferredChannel: input.preferredChannel ?? 'whatsapp',
          city: input.city,
          district: input.district,
          address: input.address,
          tags: input.tags ?? [],
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'contact.created',
        aggregateType: 'contact',
        aggregateId: created.id,
        payload: { contactId: created.id, fullName: created.fullName },
      });
      return created;
    });

    await this.audit.record({
      action: 'contact.created',
      resourceType: 'contact',
      resourceId: contact.id,
      afterValue: { fullName: contact.fullName, phoneNormalized },
    });

    return contact.id;
  }

  async list(opts: { q?: string; page?: number; limit?: number; role?: string }) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);

    const roleFilters: Prisma.ContactWhereInput[] = [];
    if (opts.role === 'buyer') roleFilters.push({ isBuyer: true });
    if (opts.role === 'seller') roleFilters.push({ isSeller: true });
    if (opts.role === 'tenant') roleFilters.push({ isTenant: true });
    if (opts.role === 'landlord') roleFilters.push({ isLandlord: true });
    if (opts.role === 'investor') roleFilters.push({ isInvestor: true });

    const where: Prisma.ContactWhereInput = {
      tenantId,
      deletedAt: null,
      ...(roleFilters.length ? { OR: roleFilters } : {}),
      ...(opts.q
        ? {
            OR: [
              { fullName: { contains: opts.q, mode: 'insensitive' } },
              { fullNameAr: { contains: opts.q } },
              { phoneNormalized: { contains: opts.q } },
              { emailLower: { contains: opts.q.toLowerCase() } },
              { nationalId: { contains: opts.q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const tenantId = this.ctx.requireTenantId();
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        leads: { take: 20, orderBy: { createdAt: 'desc' } },
        deals: { include: { deal: true } },
        activities: { take: 50, orderBy: { createdAt: 'desc' } },
        ownedProps: { include: { property: true } },
        viewings: { take: 20, orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: string, data: Partial<CreateContactInput>) {
    const tenantId = this.ctx.requireTenantId();
    const current = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Contact not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true },
    });

    const phoneNormalized = data.phone
      ? this.phone.normalize(data.phone, tenant!.country)
      : undefined;

    await this.prisma.contact.update({
      where: { id },
      data: {
        fullName: data.fullName,
        fullNameAr: data.fullNameAr,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        phoneNormalized,
        email: data.email,
        emailLower: data.email?.trim().toLowerCase(),
        nationalId: data.nationalId,
        isBuyer: data.isBuyer,
        isSeller: data.isSeller,
        isTenant: data.isTenant,
        isLandlord: data.isLandlord,
        isInvestor: data.isInvestor,
        preferredChannel: data.preferredChannel,
        city: data.city,
        district: data.district,
        address: data.address,
        tags: data.tags,
      },
    });

    await this.audit.record({
      action: 'contact.updated',
      resourceType: 'contact',
      resourceId: id,
      beforeValue: current,
      afterValue: data,
    });
  }
}
