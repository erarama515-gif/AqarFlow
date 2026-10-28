import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OutboxAppendInput {
  tenantId?: string | null;
  eventType: string;
  aggregateType?: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
}

/**
 * OutboxService
 *
 * Implements the transactional outbox pattern. Domain events are written to
 * `outbox_events` inside the same database transaction as the business write
 * that produced them. The OutboxPublisher reads from that table and forwards
 * events to the in-process event bus (and eventually Redis Streams / Kafka).
 *
 * This guarantees that every persisted state change has at least one chance
 * of being broadcast, even if the process crashes between write and dispatch.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an event to the outbox. MUST be called inside a Prisma transaction;
   * pass the transaction client as `tx` so the insert participates in the
   * same atomic unit as the originating write.
   */
  async append(
    tx: Prisma.TransactionClient,
    input: OutboxAppendInput,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        eventType: input.eventType,
        aggregateType: input.aggregateType ?? null,
        aggregateId: input.aggregateId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Convenience for cases where you have no surrounding transaction.
   * Prefer the `tx`-based variant above whenever possible.
   */
  async appendStandalone(input: OutboxAppendInput): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        eventType: input.eventType,
        aggregateType: input.aggregateType ?? null,
        aggregateId: input.aggregateId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }
}
