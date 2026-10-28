import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

export interface PaymentPlanInstallment {
  name: string;
  type: 'percentage' | 'fixed' | 'milestone';
  value: number; // percentage 0-100 OR fixed amount
  milestone?: 'booking' | 'foundation' | 'walls' | 'roof' | '50%' | '75%' | 'handover' | 'post_handover';
  daysOffset?: number; // for post-handover schedules
  dueDate?: string;
}

export interface CreatePaymentPlanInput {
  name: string;
  description?: string;
  isTemplate?: boolean;
  downPaymentPct?: number;
  postHandoverYears?: number;
  installments: PaymentPlanInstallment[];
}

@Injectable()
export class PaymentPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
  ) {}

  async create(input: CreatePaymentPlanInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    this.validate(input);

    const plan = await this.prisma.paymentPlan.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        isTemplate: input.isTemplate ?? false,
        downPaymentPct: input.downPaymentPct ? (input.downPaymentPct as any) : null,
        postHandoverYears: input.postHandoverYears,
        installments: input.installments as any,
      },
    });
    return plan.id;
  }

  /**
   * Convert a payment plan into a concrete schedule of amounts for a given
   * sale price. Percentage installments are resolved against the price;
   * milestone-based ones produce indicative dates anchored to a target
   * handover date.
   */
  calculateSchedule(
    installments: PaymentPlanInstallment[],
    totalPrice: number,
    handoverDate?: Date,
  ): Array<{ name: string; amount: number; dueDate?: string }> {
    return installments.map((i) => {
      let amount = 0;
      if (i.type === 'percentage') amount = (totalPrice * i.value) / 100;
      else if (i.type === 'fixed') amount = i.value;
      else if (i.type === 'milestone') amount = (totalPrice * i.value) / 100;

      let dueDate = i.dueDate;
      if (handoverDate && i.milestone === 'handover') dueDate = handoverDate.toISOString();
      if (handoverDate && i.milestone === 'post_handover' && i.daysOffset) {
        dueDate = new Date(
          handoverDate.getTime() + i.daysOffset * 24 * 60 * 60 * 1000,
        ).toISOString();
      }
      return { name: i.name, amount, dueDate };
    });
  }

  validate(input: CreatePaymentPlanInput): void {
    if (!input.installments || input.installments.length === 0) {
      throw new BadRequestException('At least one installment is required');
    }
    const pctSum = input.installments
      .filter((i) => i.type === 'percentage' || i.type === 'milestone')
      .reduce((s, i) => s + i.value, 0);
    const dp = input.downPaymentPct ?? 0;
    if (Math.abs(pctSum + dp - 100) > 0.01) {
      throw new BadRequestException(
        `Percentage installments + down payment must total 100% (got ${pctSum + dp}%)`,
      );
    }
  }
}
