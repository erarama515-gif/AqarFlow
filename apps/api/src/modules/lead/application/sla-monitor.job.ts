import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

/**
 * SlaMonitorJob
 *
 * Runs every minute and surfaces leads whose SLA has lapsed without first
 * contact. We don't auto-reassign here — we emit a `lead.sla_breached` event
 * and let the notification + workflow modules decide what to do (alert the
 * agent, escalate to manager, recycle to the pool).
 *
 * The `slaDueAt` field is stamped at assignment time; once the agent records
 * any activity that updates `firstContactedAt`, the lead drops out of this
 * query naturally.
 */
@Injectable()
export class SlaMonitorJob {
  private readonly logger = new Logger(SlaMonitorJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async check(): Promise<void> {
    const now = new Date();
    const breached = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: LeadStatus.NEW,
        slaDueAt: { lte: now },
        firstContactedAt: null,
      },
      select: { id: true, tenantId: true, assignedToId: true, slaDueAt: true },
      take: 100,
    });

    if (breached.length === 0) return;

    for (const lead of breached) {
      await this.prisma.$transaction(async (tx) => {
        // Avoid duplicate alerts: bump slaDueAt forward so we only escalate once
        await tx.lead.update({
          where: { id: lead.id },
          data: { slaDueAt: new Date(now.getTime() + 30 * 60_000) },
        });
        await this.outbox.append(tx, {
          tenantId: lead.tenantId,
          eventType: 'lead.sla_breached',
          aggregateType: 'lead',
          aggregateId: lead.id,
          payload: {
            leadId: lead.id,
            assignedToId: lead.assignedToId,
            dueAt: lead.slaDueAt,
            breachedAt: now,
          },
        });
      });
    }
    this.logger.warn(`SLA breached for ${breached.length} lead(s)`);
  }
}
