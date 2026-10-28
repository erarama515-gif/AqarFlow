import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, InventoryStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

/**
 * Scheduled enforcer for the two booking deadlines:
 *   - PENDING_PAYMENT bookings whose paymentDueAt has lapsed → CANCELLED + unit released
 *   - ACTIVE bookings whose spaDueAt has lapsed → EXPIRED + unit released
 *
 * Runs every minute. The release of the unit is performed in the same DB
 * transaction so we never end up with an "expired but still RESERVED" record.
 */
@Injectable()
export class BookingExpiryJob {
  private readonly logger = new Logger(BookingExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runOnce(): Promise<void> {
    const now = new Date();

    // 1. Payment timeout
    const unpaid = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        paymentDueAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, tenantId: true, propertyId: true, bookingNumber: true },
      take: 100,
    });
    for (const b of unpaid) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: now,
            cancellationReason: 'PAYMENT_DUE_DATE_PASSED',
          },
        });
        await tx.property.update({
          where: { id: b.propertyId },
          data: { inventoryStatus: InventoryStatus.AVAILABLE },
        });
        await this.outbox.append(tx, {
          tenantId: b.tenantId,
          eventType: 'booking.payment_deadline_missed',
          aggregateType: 'booking',
          aggregateId: b.id,
          payload: { bookingNumber: b.bookingNumber },
        });
      });
    }

    // 2. SPA timeout — forfeit, do not refund
    const spaLapsed = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.ACTIVE,
        spaDueAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, tenantId: true, propertyId: true, bookingNumber: true },
      take: 100,
    });
    for (const b of spaLapsed) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            status: BookingStatus.EXPIRED,
            expiredAt: now,
            cancellationReason: 'SPA_DUE_DATE_PASSED',
          },
        });
        await tx.property.update({
          where: { id: b.propertyId },
          data: { inventoryStatus: InventoryStatus.AVAILABLE },
        });
        await this.outbox.append(tx, {
          tenantId: b.tenantId,
          eventType: 'booking.expired',
          aggregateType: 'booking',
          aggregateId: b.id,
          payload: { bookingNumber: b.bookingNumber },
        });
      });
    }

    if (unpaid.length || spaLapsed.length) {
      this.logger.warn(
        `Booking expiry: cancelled ${unpaid.length} unpaid, expired ${spaLapsed.length} unsigned`,
      );
    }
  }
}
