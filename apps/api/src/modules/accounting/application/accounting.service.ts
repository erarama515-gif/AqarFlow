
import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TenantContextService } from "../../../shared/tenant/tenant-context.service";
import { assertBalanced } from "../domain/double-entry-rules";
@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService, private readonly ctx: TenantContextService) {}
  async postJournal(params: { tenantId: string; journalNo: string; entryDate: Date; description?: string; lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>; sourceType?: string; sourceId?: string }) {
    const lines = params.lines.map((l: any) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }));
    assertBalanced(lines);
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.journalEntry.findFirst({ where: { tenantId: params.tenantId, journalNo: params.journalNo } });
      if (existing) throw new BadRequestException(`Duplicate journal number: ${params.journalNo}`);
      const entry = await tx.journalEntry.create({ data: { tenantId: params.tenantId, journalNo: params.journalNo, entryDate: params.entryDate, description: params.description, sourceType: params.sourceType, sourceId: params.sourceId, isPosted: true, postedAt: new Date() }, include: { lines: true } });
      await tx.journalEntryLine.createMany({ data: lines.map((l: any) => ({ journalEntryId: entry.id, accountId: l.accountId, debit: l.debit, credit: l.credit, description: l.description })) });
      return entry;
    });
  }
  async createReceipt(params: { tenantId: string; receiptNo: string; contactId: string; amount: number; currency: string; paymentMethod: string; receivedAt: Date; referenceNo?: string }) {
    return this.prisma.$transaction(async (tx: any) => {
      const dup = await tx.receipt.findFirst({ where: { tenantId: params.tenantId, receiptNo: params.receiptNo } });
      if (dup) throw new BadRequestException(`Receipt ${params.receiptNo} already exists (idempotent)`);
      return (await tx.receipt.create({ data: params as any })).id;
    });
  }
}

