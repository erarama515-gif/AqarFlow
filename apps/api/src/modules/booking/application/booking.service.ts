import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  BookingPaymentMethod,
  BookingStatus,
  InventoryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { assertBookingTransition } from '../domain/booking-state-machine';

export interface CreateBookingInput {
  propertyId: string;
  contactId: string;
  agentId?: string;            // defaults to current user
  leadId?: string;
  unitPrice: number;
  bookingFee: number;
  currency: string;
  paymentPlanId?: string;
  paymentDueInHours?: number;  // default 72
  spaDueInDays?: number;       // default 21
  coolingOffDays?: number;     // default 7
  notes?: string;
}

interface ListOptions {
  status?: BookingStatus;
  agentId?: string;
  propertyId?: string;
  contactId?: string;
  page?: number;
  limit?: number;
}

/**
 * BookingService
 *
 * Implements the formal booking lifecycle for off-plan and resale units.
 * A booking sits between a soft Reservation (24-72h hold) and a closed Deal:
 * - Once created, the unit moves to RESERVED in inventory.
 * - When the booking fee is received, the booking becomes ACTIVE.
 * - When the SPA is signed, a Deal is created, the unit becomes SOLD and the
 *   commission engine is triggered via the existing `deal.won` event.
 * - If deadlines lapse, a scheduled job auto-expires the booking and releases
 *   the unit back to AVAILABLE.
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  async create(input: CreateBookingInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const agentId = input.agentId ?? this.ctx.userId;
    if (!agentId) throw new BadRequestException('Agent context required');
    if (input.bookingFee < 0) throw new BadRequestException('Booking fee must be ≥ 0');
    if (input.unitPrice <= 0) throw new BadRequestException('Unit price must be > 0');
    if (input.bookingFee > input.unitPrice) {
      throw new BadRequestException('Booking fee cannot exceed unit price');
    }

    // Ensure the property is actually bookable
    const property = await this.prisma.property.findFirst({
      where: { id: input.propertyId, tenantId, deletedAt: null },
      select: { id: true, inventoryStatus: true, referenceCode: true, currency: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    const bookable: InventoryStatus[] = [InventoryStatus.AVAILABLE, InventoryStatus.RESERVED];
    if (!bookable.includes(property.inventoryStatus)) {
      throw new ConflictException(
        `Property is ${property.inventoryStatus} — only AVAILABLE or RESERVED units can be booked`,
      );
    }

    // Verify the contact exists in the tenant
    const contact = await this.prisma.contact.findFirst({
      where: { id: input.contactId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const paymentDueAt = new Date(
      Date.now() + (input.paymentDueInHours ?? 72) * 60 * 60 * 1000,
    );
    const spaDueAt = new Date(
      Date.now() + (input.spaDueInDays ?? 21) * 24 * 60 * 60 * 1000,
    );
    const coolingOffEndsAt = new Date(
      Date.now() + (input.coolingOffDays ?? 7) * 24 * 60 * 60 * 1000,
    );

    const bookingNumber = await this.generateBookingNumber(tenantId);

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          tenantId,
          bookingNumber,
          propertyId: input.propertyId,
          contactId: input.contactId,
          agentId,
          leadId: input.leadId,
          unitPrice: new Prisma.Decimal(input.unitPrice),
          bookingFee: new Prisma.Decimal(input.bookingFee),
          currency: input.currency,
          paymentPlanId: input.paymentPlanId,
          status: BookingStatus.PENDING_PAYMENT,
          paymentDueAt,
          spaDueAt,
          coolingOffEndsAt,
          notes: input.notes,
          createdById: this.ctx.userId,
        },
      });

      // Take the unit off market so two agents can't book it in parallel
      await tx.property.update({
        where: { id: input.propertyId },
        data: { inventoryStatus: InventoryStatus.RESERVED },
      });

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'booking.created',
        aggregateType: 'booking',
        aggregateId: booking.id,
        payload: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          propertyId: booking.propertyId,
          contactId: booking.contactId,
          agentId,
          paymentDueAt,
          spaDueAt,
        },
      });
      return booking;
    });

    await this.audit.record({
      action: 'booking.created',
      resourceType: 'booking',
      resourceId: created.id,
      afterValue: {
        bookingNumber: created.bookingNumber,
        property: property.referenceCode,
        unitPrice: input.unitPrice,
        bookingFee: input.bookingFee,
        currency: input.currency,
      },
    });

    return created.id;
  }

  // ---------------------------------------------------------------------------
  // RECORD PAYMENT — moves PENDING_PAYMENT → ACTIVE
  // ---------------------------------------------------------------------------
  async recordPayment(
    id: string,
    input: { method: BookingPaymentMethod; reference?: string; receivedAt?: Date },
  ): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    assertBookingTransition(booking.status, BookingStatus.ACTIVE);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.ACTIVE,
          feeReceivedAt: input.receivedAt ?? new Date(),
          paymentMethod: input.method,
          paymentReference: input.reference,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'booking.payment_received',
        aggregateType: 'booking',
        aggregateId: id,
        payload: {
          bookingId: id,
          amount: booking.bookingFee.toString(),
          currency: booking.currency,
          method: input.method,
        },
      });
    });

    await this.audit.record({
      action: 'booking.payment_received',
      resourceType: 'booking',
      resourceId: id,
      afterValue: { method: input.method, reference: input.reference },
    });
  }

  // ---------------------------------------------------------------------------
  // SIGN SPA — moves ACTIVE → CONVERTED_TO_SALE + creates Deal + marks unit SOLD
  // ---------------------------------------------------------------------------
  async signSpa(id: string): Promise<{ dealId: string }> {
    const tenantId = this.ctx.requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { tenant: { select: { id: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    assertBookingTransition(booking.status, BookingStatus.CONVERTED_TO_SALE);

    // Ensure a default pipeline + Won stage exist
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!pipeline) throw new ConflictException('No default pipeline configured');
    const wonStage = pipeline.stages.find((s) => s.isWon);
    if (!wonStage) throw new ConflictException('Default pipeline has no WON stage');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create the deal directly in WON stage (booking already vetted the buyer)
      const refCode = `D-BK${booking.bookingNumber.slice(-6)}`;
      const deal = await tx.deal.create({
        data: {
          tenantId,
          pipelineId: pipeline.id,
          stageId: wonStage.id,
          ownerId: booking.agentId,
          referenceCode: refCode,
          title: `Booking ${booking.bookingNumber}`,
          status: 'WON',
          amount: booking.unitPrice,
          currency: booking.currency,
          probability: 100,
          wonAt: new Date(),
          closedAt: new Date(),
          sourceLeadId: booking.leadId,
          parties: { create: [{ contactId: booking.contactId, role: 'BUYER' }] },
          items: {
            create: [{
              propertyId: booking.propertyId,
              amount: booking.unitPrice,
              currency: booking.currency,
            }],
          },
        },
      });

      // 2. Update booking
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONVERTED_TO_SALE,
          dealId: deal.id,
          spaSignedAt: new Date(),
        },
      });

      // 3. Move the unit to SOLD
      await tx.property.update({
        where: { id: booking.propertyId },
        data: { inventoryStatus: InventoryStatus.SOLD },
      });

      // 4. Fire deal.won so the commission engine picks it up automatically
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'booking.converted_to_sale',
        aggregateType: 'booking',
        aggregateId: id,
        payload: { bookingId: id, dealId: deal.id },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'deal.won',
        aggregateType: 'deal',
        aggregateId: deal.id,
        payload: {
          dealId: deal.id,
          amount: booking.unitPrice.toString(),
          currency: booking.currency,
        },
      });
      return { dealId: deal.id };
    });

    await this.audit.record({
      action: 'booking.signed_spa',
      resourceType: 'booking',
      resourceId: id,
      afterValue: { dealId: result.dealId },
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // CANCEL — refundable within cooling-off, otherwise forfeit
  // ---------------------------------------------------------------------------
  async cancel(id: string, reason: string): Promise<{ refundAmount: number }> {
    const tenantId = this.ctx.requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const now = new Date();
    const withinCoolingOff =
      !!booking.coolingOffEndsAt && now <= booking.coolingOffEndsAt;
    const targetStatus = withinCoolingOff
      ? BookingStatus.CANCELLED
      : BookingStatus.FORFEITED;
    assertBookingTransition(booking.status, targetStatus);

    const refundAmount = withinCoolingOff ? Number(booking.bookingFee) : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: targetStatus,
          cancelledAt: withinCoolingOff ? now : booking.cancelledAt,
          forfeitedAt: !withinCoolingOff ? now : booking.forfeitedAt,
          cancellationReason: reason,
          refundAmount: withinCoolingOff ? new Prisma.Decimal(refundAmount) : null,
          refundedAt: withinCoolingOff ? now : null,
        },
      });
      // Release the unit back to AVAILABLE
      await tx.property.update({
        where: { id: booking.propertyId },
        data: { inventoryStatus: InventoryStatus.AVAILABLE },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: withinCoolingOff ? 'booking.cancelled' : 'booking.forfeited',
        aggregateType: 'booking',
        aggregateId: id,
        payload: { bookingId: id, reason, refundAmount, currency: booking.currency },
      });
    });

    await this.audit.record({
      action: withinCoolingOff ? 'booking.cancelled' : 'booking.forfeited',
      resourceType: 'booking',
      resourceId: id,
      afterValue: { reason, refundAmount, withinCoolingOff },
    });
    return { refundAmount };
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------
  async findById(id: string) {
    const tenantId = this.ctx.requireTenantId();
    const canReadAny = this.ctx.hasPermission('booking:read');
    const ownerScope = !canReadAny ? { agentId: this.ctx.userId } : {};
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null, ...ownerScope },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async list(opts: ListOptions) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const canReadAny = this.ctx.hasPermission('booking:read');
    const ownerScope = !canReadAny ? { agentId: this.ctx.userId } : {};

    const where: Prisma.BookingWhereInput = {
      tenantId,
      deletedAt: null,
      status: opts.status,
      agentId: opts.agentId ?? ownerScope.agentId,
      propertyId: opts.propertyId,
      contactId: opts.contactId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  /** Sequential number per tenant per year — e.g., BK-2026-000123. */
  private async generateBookingNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.booking.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00Z`),
        },
      },
    });
    return `BK-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
