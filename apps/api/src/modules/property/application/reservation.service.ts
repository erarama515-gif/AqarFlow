import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

interface ReserveInput {
  propertyId: string;
  contactId?: string;
  leadId?: string;
  amount?: number;
  currency?: string;
  expiresInHours?: number;
  notes?: string;
}

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly outbox: OutboxService,
  ) {}

  async reserve(input: ReserveInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    if (!userId) throw new BadRequestException('No user in context');

    const property = await this.prisma.property.findFirst({
      where: { id: input.propertyId, tenantId, deletedAt: null },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.inventoryStatus !== InventoryStatus.AVAILABLE) {
      throw new BadRequestException(`Property is ${property.inventoryStatus}, cannot reserve`);
    }

    const hours = Math.max(1, Math.min(168, input.expiresInHours ?? 24));
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const reservation = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.create({
        data: {
          tenantId,
          propertyId: input.propertyId,
          contactId: input.contactId,
          leadId: input.leadId,
          reservedById: userId,
          expiresAt,
          amount: input.amount ? (input.amount as any) : undefined,
          currency: input.currency,
          notes: input.notes,
        },
      });
      await tx.property.update({
        where: { id: input.propertyId },
        data: { inventoryStatus: InventoryStatus.RESERVED },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'property.reserved',
        aggregateType: 'property',
        aggregateId: input.propertyId,
        payload: { reservationId: r.id, reservedById: userId, expiresAt },
      });
      return r;
    });
    return reservation.id;
  }

  async cancel(reservationId: string, reason?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId, status: 'ACTIVE' },
    });
    if (!reservation) throw new NotFoundException('Active reservation not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      });
      await tx.property.update({
        where: { id: reservation.propertyId },
        data: { inventoryStatus: InventoryStatus.AVAILABLE },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'reservation.cancelled',
        aggregateType: 'reservation',
        aggregateId: reservationId,
        payload: { reason },
      });
    });
  }

  /**
   * Auto-release reservations that have passed their `expiresAt`. Runs every
   * minute and frees the property in a single transaction so the next agent
   * can claim it immediately.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpired(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.reservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      take: 100,
    });
    for (const r of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: r.id },
          data: { status: 'EXPIRED' },
        });
        await tx.property.update({
          where: { id: r.propertyId },
          data: { inventoryStatus: InventoryStatus.AVAILABLE },
        });
        await this.outbox.append(tx, {
          tenantId: r.tenantId,
          eventType: 'reservation.expired',
          aggregateType: 'reservation',
          aggregateId: r.id,
          payload: { propertyId: r.propertyId },
        });
      });
    }
  }
}
