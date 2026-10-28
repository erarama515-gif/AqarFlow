import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DealPartyRole, DealStatus, InventoryStatus, Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

const refCodeGen = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 7);

interface CreateDealInput {
  title: string;
  pipelineCode?: string;
  amount?: number;
  currency?: string;
  expectedCloseAt?: Date;
  branchId?: string;
  buyerContactId?: string;
  sellerContactId?: string;
  propertyId?: string;
  sourceLeadId?: string;
  notes?: string;
  tags?: string[];
}

@Injectable()
export class DealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateDealInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    if (!userId) throw new BadRequestException('User context missing');

    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        tenantId,
        ...(input.pipelineCode ? { code: input.pipelineCode } : { isDefault: true }),
      },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!pipeline || pipeline.stages.length === 0) {
      throw new BadRequestException('No pipeline available; configure one first');
    }
    const firstStage = pipeline.stages[0];

    const referenceCode = `D-${refCodeGen()}`;

    const deal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          tenantId,
          branchId: input.branchId,
          pipelineId: pipeline.id,
          stageId: firstStage.id,
          ownerId: userId,
          referenceCode,
          title: input.title.trim(),
          amount: input.amount ? new Prisma.Decimal(input.amount) : null,
          currency: input.currency,
          probability: firstStage.probability,
          expectedCloseAt: input.expectedCloseAt,
          sourceLeadId: input.sourceLeadId,
          tags: input.tags ?? [],
          parties: {
            create: [
              ...(input.buyerContactId
                ? [{ contactId: input.buyerContactId, role: DealPartyRole.BUYER }]
                : []),
              ...(input.sellerContactId
                ? [{ contactId: input.sellerContactId, role: DealPartyRole.SELLER }]
                : []),
            ],
          },
          items: input.propertyId
            ? {
                create: [
                  {
                    propertyId: input.propertyId,
                    amount: input.amount ? new Prisma.Decimal(input.amount) : null,
                    currency: input.currency,
                  },
                ],
              }
            : undefined,
        },
      });

      await tx.dealStageHistory.create({
        data: {
          dealId: created.id,
          toStageId: firstStage.id,
          changedById: userId,
          notes: 'Deal created',
        },
      });

      if (input.sourceLeadId) {
        await tx.lead.update({
          where: { id: input.sourceLeadId },
          data: { convertedDealId: created.id },
        });
      }

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'deal.created',
        aggregateType: 'deal',
        aggregateId: created.id,
        payload: { dealId: created.id, ownerId: userId, amount: input.amount, currency: input.currency },
      });
      return created;
    });

    return deal.id;
  }

  async moveToStage(id: string, toStageCode: string, notes?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;

    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { pipeline: { include: { stages: true } } },
    });
    if (!deal) throw new NotFoundException('Deal not found');

    const targetStage = deal.pipeline.stages.find((s) => s.code === toStageCode);
    if (!targetStage) throw new BadRequestException(`Stage ${toStageCode} not in this pipeline`);
    if (deal.stageId === targetStage.id) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id },
        data: {
          stageId: targetStage.id,
          probability: targetStage.probability,
          status: targetStage.isWon ? DealStatus.WON : targetStage.isLost ? DealStatus.LOST : deal.status,
          wonAt: targetStage.isWon ? new Date() : deal.wonAt,
          lostAt: targetStage.isLost ? new Date() : deal.lostAt,
          closedAt: targetStage.isWon || targetStage.isLost ? new Date() : deal.closedAt,
        },
      });
      await tx.dealStageHistory.create({
        data: {
          dealId: id,
          fromStageId: deal.stageId,
          toStageId: targetStage.id,
          changedById: userId,
          notes,
        },
      });

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'deal.stage_changed',
        aggregateType: 'deal',
        aggregateId: id,
        payload: { fromStageId: deal.stageId, toStageId: targetStage.id },
      });

      // If won → trigger commission calculation + mark property sold/rented
      if (targetStage.isWon) {
        await this.outbox.append(tx, {
          tenantId,
          eventType: 'deal.won',
          aggregateType: 'deal',
          aggregateId: id,
          payload: { dealId: id, amount: deal.amount, currency: deal.currency },
        });
        // Mark linked properties as sold/rented
        const items = await tx.dealItem.findMany({ where: { dealId: id } });
        for (const item of items) {
          await tx.property.update({
            where: { id: item.propertyId },
            data: { inventoryStatus: InventoryStatus.SOLD },
          });
        }
      }
      if (targetStage.isLost) {
        await this.outbox.append(tx, {
          tenantId,
          eventType: 'deal.lost',
          aggregateType: 'deal',
          aggregateId: id,
          payload: { dealId: id },
        });
      }
    });

    await this.audit.record({
      action: 'deal.stage_changed',
      resourceType: 'deal',
      resourceId: id,
      beforeValue: { stageId: deal.stageId },
      afterValue: { stageId: targetStage.id, notes },
    });
  }

  async kanban(pipelineCode?: string) {
    const tenantId = this.ctx.requireTenantId();
    // Agents see only their own deals; managers/admins see the full board.
    const canReadAny = this.ctx.hasPermission('deal:read');
    const ownerScope = !canReadAny ? { ownerId: this.ctx.userId } : {};
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, ...(pipelineCode ? { code: pipelineCode } : { isDefault: true }) },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            deals: {
              where: {
                deletedAt: null,
                status: { notIn: [DealStatus.LOST, DealStatus.CANCELLED] },
                ...ownerScope,
              },
              orderBy: { updatedAt: 'desc' },
              take: 50,
              include: {
                owner: { select: { id: true, firstName: true, lastName: true } },
                parties: { include: { contact: { select: { id: true, fullName: true } } } },
              },
            },
          },
        },
      },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async findById(id: string) {
    const tenantId = this.ctx.requireTenantId();
    const canReadAny = this.ctx.hasPermission('deal:read');
    const ownerScope = !canReadAny ? { ownerId: this.ctx.userId } : {};
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null, ...ownerScope },
      include: {
        pipeline: { include: { stages: { orderBy: { sortOrder: 'asc' } } } },
        stage: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        parties: { include: { contact: true } },
        items: { include: { property: true } },
        stageHistory: { orderBy: { changedAt: 'desc' }, take: 50 },
        activities: { take: 50, orderBy: { createdAt: 'desc' } },
        commissionEntries: true,
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async list(opts: { status?: DealStatus; ownerId?: string; page?: number; limit?: number }) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const where: Prisma.DealWhereInput = {
      tenantId,
      deletedAt: null,
      status: opts.status,
      ownerId: opts.ownerId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          stage: { select: { code: true, name: true, probability: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);
    return { items, total };
  }

  async forecast() {
    const tenantId = this.ctx.requireTenantId();
    const canReadAny = this.ctx.hasPermission('deal:read');
    const ownerScope = !canReadAny ? { ownerId: this.ctx.userId } : {};
    const open = await this.prisma.deal.findMany({
      where: { tenantId, deletedAt: null, status: DealStatus.OPEN, ...ownerScope },
      select: { amount: true, currency: true, probability: true },
    });
    let total = 0;
    let weighted = 0;
    const byCurrency: Record<string, { total: number; weighted: number }> = {};
    for (const d of open) {
      const v = d.amount ? Number(d.amount) : 0;
      total += v;
      weighted += v * (d.probability / 100);
      const cur = d.currency || 'USD';
      byCurrency[cur] = byCurrency[cur] ?? { total: 0, weighted: 0 };
      byCurrency[cur].total += v;
      byCurrency[cur].weighted += v * (d.probability / 100);
    }
    return { deals: open.length, total, weighted, byCurrency };
  }
}
