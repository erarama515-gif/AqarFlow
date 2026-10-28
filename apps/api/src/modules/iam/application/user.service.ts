import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PasswordService } from '../domain/password.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';

interface CreateUserInput {
  tenantId: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleCode?: string;
  branchIds?: string[];
  status?: 'PENDING' | 'ACTIVE';
}

interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  branchIds?: string[];
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Create — used by tenant signup (owner) and team invitations
  // ---------------------------------------------------------------------------
  async create(input: CreateUserInput): Promise<string> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: input.tenantId, email, deletedAt: null },
    });
    if (existing) throw new ConflictException('User with this email already exists');

    let passwordHash: string | undefined;
    if (input.password) {
      const issue = this.passwords.validatePolicy(input.password);
      if (issue) throw new ConflictException(issue);
      passwordHash = await this.passwords.hash(input.password);
    }

    const role = input.roleCode
      ? await this.prisma.role.findFirst({
          where: {
            OR: [
              { tenantId: input.tenantId, code: input.roleCode },
              { tenantId: null, code: input.roleCode },
            ],
          },
        })
      : null;

    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        status: input.status ?? 'ACTIVE',
        roles: role
          ? { create: [{ roleId: role.id }] }
          : undefined,
        branches: input.branchIds?.length
          ? {
              create: input.branchIds.map((b, i) => ({
                branchId: b,
                isPrimary: i === 0,
              })),
            }
          : undefined,
      },
    });

    await this.audit.record({
      action: 'iam.user.created',
      tenantId: input.tenantId,
      resourceType: 'user',
      resourceId: user.id,
      afterValue: { email, firstName: input.firstName, lastName: input.lastName },
    });

    return user.id;
  }

  async invite(input: InviteUserInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    return this.create({
      tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      roleCode: input.roleCode,
      branchIds: input.branchIds,
      status: 'PENDING',
      // No password yet — invitation flow sets it on first acceptance
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  async list(opts: { page?: number; limit?: number; search?: string } = {}): Promise<{
    items: unknown[];
    total: number;
  }> {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
      ...(opts.search
        ? {
            OR: [
              { email: { contains: opts.search, mode: 'insensitive' } },
              { firstName: { contains: opts.search, mode: 'insensitive' } },
              { lastName: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fullNameAr: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { code: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<unknown> {
    const tenantId = this.ctx.requireTenantId();
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        branches: { include: { branch: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async suspend(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    await this.audit.record({
      action: 'iam.user.suspended',
      tenantId,
      resourceType: 'user',
      resourceId: id,
    });
  }

  async reactivate(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    await this.audit.record({
      action: 'iam.user.reactivated',
      tenantId,
      resourceType: 'user',
      resourceId: id,
    });
  }

  async softDelete(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
    await this.audit.record({
      action: 'iam.user.deleted',
      tenantId,
      resourceType: 'user',
      resourceId: id,
    });
  }
}
