import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, NotificationPriority } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OutboxPublisher } from '../../../shared/outbox/outbox.publisher';
import { EmailTransport } from '../infrastructure/email.transport';
import { NotificationGateway } from '../infrastructure/notification.gateway';

interface NotifyInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxPublisher,
    private readonly email: EmailTransport,
    private readonly gateway: NotificationGateway,
  ) {}

  // ---------------------------------------------------------------------------
  // Subscribe to domain events on module init and turn them into notifications
  // ---------------------------------------------------------------------------
  onModuleInit(): void {
    this.outbox.on('lead.assigned', async (env: any) => {
      const assignedToId = env.payload?.assignedToId;
      if (!assignedToId) return;
      await this.notify({
        tenantId: env.tenantId,
        userId: assignedToId,
        type: 'lead.assigned',
        title: 'New lead assigned to you',
        body: `Lead ${env.aggregateId} has been routed to you. Reach out before the SLA elapses.`,
        link: `/leads/${env.aggregateId}`,
        priority: NotificationPriority.HIGH,
      });
    });

    this.outbox.on('lead.sla_breached', async (env: any) => {
      const assignedToId = env.payload?.assignedToId;
      if (!assignedToId) return;
      await this.notify({
        tenantId: env.tenantId,
        userId: assignedToId,
        type: 'lead.sla_breached',
        title: '⚠️ SLA breached on assigned lead',
        body: `The SLA on lead ${env.aggregateId} has been exceeded. Take action now.`,
        link: `/leads/${env.aggregateId}`,
        priority: NotificationPriority.URGENT,
      });
    });

    this.outbox.on('deal.won', async (env: any) => {
      // Best effort: notify the deal owner (we re-query just for the owner)
      const deal = await this.prisma.deal.findUnique({
        where: { id: env.aggregateId },
        select: { ownerId: true, referenceCode: true, title: true },
      });
      if (!deal) return;
      await this.notify({
        tenantId: env.tenantId,
        userId: deal.ownerId,
        type: 'deal.won',
        title: '🎉 Deal won!',
        body: `${deal.referenceCode} — ${deal.title}. Commission entries are being calculated.`,
        link: `/deals/${env.aggregateId}`,
        priority: NotificationPriority.HIGH,
      });
    });

    this.outbox.on('commission.calculated', async (env: any) => {
      // Notify each recipient
      const entries = await this.prisma.commissionEntry.findMany({
        where: { dealId: env.aggregateId, tenantId: env.tenantId },
        select: { recipientUserId: true, grossAmount: true, currency: true },
      });
      for (const e of entries) {
        if (!e.recipientUserId) continue;
        await this.notify({
          tenantId: env.tenantId,
          userId: e.recipientUserId,
          type: 'commission.calculated',
          title: '💰 New commission entry',
          body: `A commission of ${e.grossAmount} ${e.currency} is awaiting approval for your account.`,
          link: '/commissions/my',
          priority: NotificationPriority.NORMAL,
        });
      }
    });

    this.outbox.on('viewing.scheduled', async (env: any) => {
      const agentId = env.payload?.agentId;
      if (!agentId) return;
      await this.notify({
        tenantId: env.tenantId,
        userId: agentId,
        type: 'viewing.scheduled',
        title: '📅 Viewing scheduled',
        body: `A viewing has been added to your calendar.`,
        link: `/calendar`,
        priority: NotificationPriority.NORMAL,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------
  async notify(input: NotifyInput): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, status: true, firstName: true },
    });
    if (!user || user.status !== 'ACTIVE') return;

    const notification = await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        channel: input.channel ?? NotificationChannel.IN_APP,
        priority: input.priority ?? NotificationPriority.NORMAL,
        title: input.title,
        body: input.body,
        link: input.link,
        metadata: (input.metadata ?? null) as any,
        sentAt: new Date(),
      },
    });

    // Push via WebSocket (best effort)
    try {
      this.gateway.emitToUser(input.userId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        priority: notification.priority,
        createdAt: notification.createdAt,
      });
    } catch (err) {
      this.logger.debug(`WS push failed for ${input.userId}: ${(err as Error).message}`);
    }

    // Mirror urgent/high-priority notifications to email
    if (
      (input.priority === NotificationPriority.HIGH || input.priority === NotificationPriority.URGENT) &&
      user.email
    ) {
      const html = this.renderEmail(input.title, input.body, input.link, user.firstName);
      try {
        await this.email.send(user.email, `[AqarFlow] ${input.title}`, html);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { deliveredAt: new Date() },
        });
      } catch (err) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { failedAt: new Date(), failureReason: (err as Error).message.slice(0, 500) },
        });
      }
    }
  }

  async listInbox(opts: { userId: string; tenantId: string; unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const where = {
      tenantId: opts.tenantId,
      userId: opts.userId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId: opts.tenantId, userId: opts.userId, readAt: null },
      }),
    ]);
    return { items, total, unread };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, tenantId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Email rendering (tiny inline template — i18n & templating ship in Phase 2)
  // ---------------------------------------------------------------------------
  private renderEmail(title: string, body: string, link?: string, firstName?: string): string {
    return `<!doctype html>
<html dir="auto"><body style="font-family:system-ui,sans-serif;background:#f6f8fa;padding:24px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <tr><td style="background:#0f172a;color:#fff;padding:18px 24px;font-weight:700;font-size:18px">AqarFlow</td></tr>
    <tr><td style="padding:24px">
      <p style="font-size:14px;color:#475569;margin:0 0 12px">Hi ${firstName ?? 'there'},</p>
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">${title}</h2>
      <p style="margin:0 0 16px;color:#334155;line-height:1.55">${body}</p>
      ${link ? `<a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open in AqarFlow</a>` : ''}
    </td></tr>
    <tr><td style="padding:14px 24px;color:#94a3b8;font-size:12px;border-top:1px solid #e5e7eb">You're receiving this because you're an AqarFlow user.</td></tr>
  </table>
</body></html>`;
  }
}
