import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityStatus, ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { AuditService } from '../../audit/audit.service';

interface CreateActivityInput {
  type: ActivityType;
  subject: string;
  description?: string;
  scheduledAt?: Date;
  durationMin?: number;
  leadId?: string;
  contactId?: string;
  dealId?: string;
  propertyId?: string;
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateActivityInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    if (!userId) throw new BadRequestException('No user in context');
    if (!input.subject?.trim()) throw new BadRequestException('Subject is required');

    const result = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          tenantId,
          userId,
          type: input.type,
          subject: input.subject.trim(),
          description: input.description,
          scheduledAt: input.scheduledAt,
          durationMin: input.durationMin,
          leadId: input.leadId,
          contactId: input.contactId,
          dealId: input.dealId,
          propertyId: input.propertyId,
          status: input.scheduledAt && input.scheduledAt > new Date() ? ActivityStatus.PLANNED : ActivityStatus.COMPLETED,
          completedAt: !input.scheduledAt ? new Date() : null,
        },
      });

      // Stamp first contact on the lead — used by SLA monitor
      if (input.leadId) {
        await tx.lead.updateMany({
          where: { id: input.leadId, firstContactedAt: null },
          data: { firstContactedAt: new Date() },
        });
      }

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'activity.created',
        aggregateType: 'activity',
        aggregateId: activity.id,
        payload: {
          activityId: activity.id,
          type: activity.type,
          leadId: activity.leadId,
          contactId: activity.contactId,
        },
      });
      return activity;
    });

    return result.id;
  }

  async complete(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.activity.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: ActivityStatus.COMPLETED, completedAt: new Date() },
    });
    await this.audit.record({
      action: 'activity.completed',
      resourceType: 'activity',
      resourceId: id,
    });
  }

  async calendar(opts: { from: Date; to: Date; userId?: string }) {
    const tenantId = this.ctx.requireTenantId();
    return this.prisma.activity.findMany({
      where: {
        tenantId,
        deletedAt: null,
        userId: opts.userId,
        scheduledAt: { gte: opts.from, lte: opts.to },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, fullName: true } },
        contact: { select: { id: true, fullName: true } },
      },
    });
  }

  async list(opts: { leadId?: string; contactId?: string; dealId?: string; propertyId?: string; page?: number; limit?: number }) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const where: Prisma.ActivityWhereInput = {
      tenantId,
      deletedAt: null,
      leadId: opts.leadId,
      contactId: opts.contactId,
      dealId: opts.dealId,
      propertyId: opts.propertyId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items, total };
  }
}
