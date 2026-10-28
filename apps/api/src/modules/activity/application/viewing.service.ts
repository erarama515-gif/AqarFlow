import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

interface ScheduleViewingInput {
  propertyId: string;
  contactId: string;
  agentId: string;
  scheduledAt: Date;
  durationMin?: number;
  notes?: string;
}

@Injectable()
export class ViewingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly outbox: OutboxService,
  ) {}

  async schedule(input: ScheduleViewingInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
      throw new BadRequestException('scheduledAt must be a valid future date');
    }

    // Conflict check — same agent, overlapping 60-minute window
    const conflict = await this.prisma.viewing.findFirst({
      where: {
        tenantId,
        agentId: input.agentId,
        status: { in: [ViewingStatus.SCHEDULED, ViewingStatus.CONFIRMED] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - 30 * 60_000),
          lte: new Date(scheduledAt.getTime() + 30 * 60_000),
        },
      },
    });
    if (conflict) {
      throw new BadRequestException('Agent has a conflicting viewing within ±30min of this slot');
    }

    const viewing = await this.prisma.$transaction(async (tx) => {
      const v = await tx.viewing.create({
        data: {
          tenantId,
          propertyId: input.propertyId,
          contactId: input.contactId,
          agentId: input.agentId,
          scheduledAt,
          durationMin: input.durationMin ?? 60,
          notes: input.notes,
          status: ViewingStatus.SCHEDULED,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'viewing.scheduled',
        aggregateType: 'viewing',
        aggregateId: v.id,
        payload: {
          viewingId: v.id,
          propertyId: v.propertyId,
          contactId: v.contactId,
          agentId: v.agentId,
          scheduledAt: v.scheduledAt,
        },
      });
      return v;
    });
    return viewing.id;
  }

  async confirm(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.viewing.updateMany({
      where: { id, tenantId, status: ViewingStatus.SCHEDULED },
      data: { status: ViewingStatus.CONFIRMED, confirmedAt: new Date() },
    });
  }

  async complete(id: string, feedback?: string, rating?: number): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.viewing.updateMany({
      where: { id, tenantId, status: { in: [ViewingStatus.SCHEDULED, ViewingStatus.CONFIRMED] } },
      data: {
        status: ViewingStatus.COMPLETED,
        completedAt: new Date(),
        feedback,
        rating,
      },
    });
  }

  async cancel(id: string, reason?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.viewing.updateMany({
      where: { id, tenantId },
      data: { status: ViewingStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
    });
  }
}
