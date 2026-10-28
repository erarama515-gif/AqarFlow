import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionStatus, Deal, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { AuditService } from '../../audit/audit.service';
// Event subscription happens in CommissionModule.onModuleInit (via OutboxPublisher).

export interface CommissionSplit {
  role: 'PRIMARY_AGENT' | 'CO_AGENT' | 'REFERRER' | 'BROKERAGE' | 'MANAGER_OVERRIDE';
  pct: number;
  recipientUserId?: string;
  recipientContactId?: string;
}

export interface CommissionCalculation {
  type: 'percentage' | 'fixed' | 'tiered';
  value?: number;
  tiers?: Array<{ minAmount: number; pct: number }>;
}

interface CreateRuleInput {
  code: string;
  name: string;
  description?: string;
  conditions: Record<string, unknown>;
  calculation: CommissionCalculation;
  splits: CommissionSplit[];
  vatRate?: number;
  clawbackDays?: number;
  priority?: number;
}

const COUNTRY_VAT: Record<string, number> = {
  SA: 15,
  AE: 5,
  EG: 14,
  KW: 0,
  QA: 0,
  BH: 10,
  OM: 5,
  JO: 16,
  MA: 20,
  IQ: 0,
  LB: 11,
};

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------
  async createRule(input: CreateRuleInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    this.validateSplits(input.splits);

    const rule = await this.prisma.commissionRule.create({
      data: {
        tenantId,
        code: input.code.trim().toUpperCase(),
        name: input.name,
        description: input.description,
        conditions: input.conditions as any,
        calculation: input.calculation as any,
        splits: input.splits as any,
        vatRate: input.vatRate ? new Prisma.Decimal(input.vatRate) : null,
        clawbackDays: input.clawbackDays,
        priority: input.priority ?? 0,
      },
    });
    return rule.id;
  }

  // ---------------------------------------------------------------------------
  // Calculation triggered by DealWon
  // ---------------------------------------------------------------------------
  async calculateForDeal(tenantId: string, dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId, deletedAt: null },
      include: { parties: true },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    if (!deal.amount) {
      throw new BadRequestException('Deal must have an amount before commission calculation');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true, currency: true },
    });

    // Find an applicable rule (highest priority matching). For MVP we apply
    // the highest-priority active rule unconditionally — full condition
    // matching ships with the workflow builder.
    const rule = await this.prisma.commissionRule.findFirst({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { priority: 'desc' },
    });
    if (!rule) {
      // No rule? Emit a flag so the UI can prompt the owner to configure one
      await this.outbox.appendStandalone({
        tenantId,
        eventType: 'commission.no_rule_found',
        aggregateType: 'deal',
        aggregateId: dealId,
        payload: { dealId },
      });
      return;
    }

    const baseAmount = Number(deal.amount);
    const grossTotal = this.computeGrossTotal(baseAmount, rule.calculation as unknown as CommissionCalculation);
    const vatRate = rule.vatRate ? Number(rule.vatRate) : COUNTRY_VAT[tenant?.country ?? 'SA'] ?? 0;
    const splits = rule.splits as unknown as CommissionSplit[];
    const currency = deal.currency ?? tenant?.currency ?? 'SAR';

    const entries: Prisma.CommissionEntryCreateManyInput[] = [];

    for (const split of splits) {
      const gross = (grossTotal * split.pct) / 100;
      const vat = (gross * vatRate) / 100;

      // For PRIMARY_AGENT/CO_AGENT/MANAGER_OVERRIDE we map to the deal owner / co-agents
      let recipientUserId = split.recipientUserId;
      let recipientContactId = split.recipientContactId;

      if (!recipientUserId && !recipientContactId) {
        if (split.role === 'PRIMARY_AGENT') {
          recipientUserId = deal.ownerId;
        }
        // CO_AGENT/REFERRER without explicit ID are left null; UI prompts owner to assign
      }

      entries.push({
        tenantId,
        dealId,
        ruleId: rule.id,
        recipientUserId,
        recipientContactId,
        recipientRole: split.role,
        baseAmount: new Prisma.Decimal(baseAmount),
        sharePct: new Prisma.Decimal(split.pct),
        grossAmount: new Prisma.Decimal(gross),
        vatRate: new Prisma.Decimal(vatRate),
        vatAmount: new Prisma.Decimal(vat),
        netAmount: new Prisma.Decimal(gross + vat),
        currency,
        status: CommissionStatus.CALCULATED,
        clawbackExpiresAt: rule.clawbackDays
          ? new Date(Date.now() + rule.clawbackDays * 24 * 60 * 60 * 1000)
          : null,
        calculationLog: {
          baseAmount,
          calculation: rule.calculation,
          appliedAt: new Date().toISOString(),
        } as any,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commissionEntry.createMany({ data: entries });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'commission.calculated',
        aggregateType: 'deal',
        aggregateId: dealId,
        payload: { dealId, entriesCount: entries.length, currency, grossTotal },
      });
    });
  }

  async approve(entryId: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    const entry = await this.prisma.commissionEntry.findFirst({
      where: { id: entryId, tenantId },
    });
    if (!entry) throw new NotFoundException('Commission entry not found');
    if (entry.status !== CommissionStatus.CALCULATED && entry.status !== CommissionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot approve entry in status ${entry.status}`);
    }

    await this.prisma.commissionEntry.update({
      where: { id: entryId },
      data: {
        status: CommissionStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
    await this.audit.record({
      action: 'commission.approved',
      resourceType: 'commission_entry',
      resourceId: entryId,
    });
  }

  async markPaid(entryId: string, paymentMethod?: string, paymentRef?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.commissionEntry.update({
      where: { id: entryId },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
        paymentMethod,
        paymentRef,
      },
    });
    await this.audit.record({
      action: 'commission.paid',
      resourceType: 'commission_entry',
      resourceId: entryId,
      metadata: { paymentMethod, paymentRef },
    });
  }

  async myCommissions() {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    if (!userId) return { items: [], totals: { pending: 0, paid: 0 } };
    const items = await this.prisma.commissionEntry.findMany({
      where: { tenantId, recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { deal: { select: { id: true, referenceCode: true, title: true } } },
      take: 200,
    });
    const totals = items.reduce(
      (acc, e) => {
        const v = Number(e.netAmount);
        if (e.status === CommissionStatus.PAID) acc.paid += v;
        else acc.pending += v;
        return acc;
      },
      { pending: 0, paid: 0 },
    );
    return { items, totals };
  }

  async list(opts: { status?: CommissionStatus; recipientUserId?: string; page?: number; limit?: number }) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, opts.limit ?? 50);
    const where: Prisma.CommissionEntryWhereInput = {
      tenantId,
      status: opts.status,
      recipientUserId: opts.recipientUserId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.commissionEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deal: { select: { id: true, referenceCode: true, title: true } },
          recipient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.commissionEntry.count({ where }),
    ]);
    return { items, total };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private computeGrossTotal(baseAmount: number, calc: CommissionCalculation): number {
    switch (calc.type) {
      case 'percentage':
        return baseAmount * ((calc.value ?? 0) / 100);
      case 'fixed':
        return calc.value ?? 0;
      case 'tiered': {
        const tier = (calc.tiers ?? [])
          .sort((a, b) => b.minAmount - a.minAmount)
          .find((t) => baseAmount >= t.minAmount);
        return tier ? baseAmount * (tier.pct / 100) : 0;
      }
      default:
        return 0;
    }
  }

  private validateSplits(splits: CommissionSplit[]): void {
    if (!splits || splits.length === 0) {
      throw new BadRequestException('At least one split is required');
    }
    const sum = splits.reduce((s, x) => s + x.pct, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new BadRequestException(`Splits must total 100% (got ${sum}%)`);
    }
  }
}
