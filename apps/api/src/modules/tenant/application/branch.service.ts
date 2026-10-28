import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CountryCode } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';

interface CreateBranchInput {
  name: string;
  code: string;
  country: CountryCode;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<unknown[]> {
    const tenantId = this.ctx.requireTenantId();
    return this.prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateBranchInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const code = input.code.trim().toUpperCase();
    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, code, deletedAt: null },
    });
    if (existing) throw new ConflictException('Branch code already exists');

    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        name: input.name,
        code,
        country: input.country,
        city: input.city,
        address: input.address,
        phone: input.phone,
        email: input.email,
      },
    });
    await this.audit.record({
      action: 'branch.created',
      resourceType: 'branch',
      resourceId: branch.id,
      afterValue: { code, name: input.name },
    });
    return branch.id;
  }

  async findById(id: string): Promise<unknown> {
    const tenantId = this.ctx.requireTenantId();
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }
}
