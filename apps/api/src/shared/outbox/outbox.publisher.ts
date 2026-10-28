import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter } from 'events';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OutboxPublisher
 *
 * Polls the `outbox_events` table on a short interval and dispatches each
 * unpublished record to the in-process event emitter, which other modules
 * subscribe to (via their own listeners). Publication marks the row as
 * `published_at`; failed rows are retried with bounded attempt counts.
 *
 * In production this can be swapped for a Postgres LISTEN/NOTIFY pump or a
 * change-data-capture pipeline (Debezium → Kafka) without changing the
 * publishing contract.
 */
@Injectable()
export class OutboxPublisher implements OnModuleInit {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly bus = new EventEmitter();
  private readonly batchSize = 50;
  private readonly maxAttempts = 5;

  constructor(private readonly prisma: PrismaService) {
    this.bus.setMaxListeners(200);
  }

  onModuleInit(): void {
    this.logger.log('Outbox publisher started (5s interval)');
  }

  /** Subscribe to all events or a specific event type. */
  on(eventType: string, listener: (payload: unknown) => void | Promise<void>): void {
    this.bus.on(eventType, listener);
  }

  @Interval(5_000)
  async pump(): Promise<void> {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null, attempts: { lt: this.maxAttempts } },
      orderBy: { createdAt: 'asc' },
      take: this.batchSize,
    });
    if (pending.length === 0) return;

    for (const event of pending) {
      try {
        this.bus.emit(event.eventType, {
          id: event.id,
          tenantId: event.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          occurredAt: event.createdAt,
        });
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Outbox publish failed for ${event.id}: ${reason}`);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            failedAt: new Date(),
            failureReason: reason.slice(0, 500),
          },
        });
      }
    }
  }
}
