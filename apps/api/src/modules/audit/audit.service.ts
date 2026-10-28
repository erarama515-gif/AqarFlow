import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';

export interface AuditRecordInput {
  action: string;
  resourceType?: string;
  resourceId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  metadata?: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * AuditService
 *
 * Fire-and-forget audit writer. Failures are logged but never propagated to
 * the caller — auditing must never block a successful business operation.
 * For tamper-evidence we'd later add hash-chain over `previous_hash`, but
 * the table already exists in the schema.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
  ) {}

  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId ?? this.ctx.tenantId ?? null,
          userId: input.userId ?? this.ctx.userId ?? null,
          action: input.action,
          resourceType: input.resourceType ?? null,
          resourceId: input.resourceId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          beforeValue: (input.beforeValue ?? null) as Prisma.InputJsonValue,
          afterValue: (input.afterValue ?? null) as Prisma.InputJsonValue,
          metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Audit write failed for action=${input.action}: ${(err as Error).message}`,
      );
    }
  }
}
