import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PasswordService } from '../domain/password.service';
import { TokenService, IssueTokensResult } from './token.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { BUILTIN_ROLES } from '../domain/permissions.catalog';

interface LoginInput {
  email: string;
  password: string;
  tenantHint?: string; // subdomain — required when email is shared across tenants
  ipAddress?: string;
  userAgent?: string;
}

interface RefreshInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // Login (email + password)
  // ---------------------------------------------------------------------------
  async login(input: LoginInput): Promise<IssueTokensResult & { user: { id: string; email: string; tenantId: string; roles: string[] } }> {
    const emailLower = input.email.trim().toLowerCase();

    // Resolve user: tenant hint disambiguates when email is reused across tenants
    const user = await this.prisma.user.findFirst({
      where: {
        email: emailLower,
        deletedAt: null,
        ...(input.tenantHint
          ? { tenant: { subdomain: input.tenantHint, deletedAt: null } }
          : {}),
      },
      include: {
        roles: { include: { role: true } },
        tenant: { select: { id: true, status: true } },
      },
    });

    if (!user || !user.passwordHash) {
      // Don't leak whether the email exists — same response for both cases.
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    if (user.tenant.status === 'SUSPENDED' || user.tenant.status === 'CANCELLED') {
      throw new UnauthorizedException('Tenant is not active');
    }

    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.recordFailedAttempt(user.id, user.failedLoginAttempts);
      await this.audit.record({
        action: 'auth.login.failed',
        userId: user.id,
        tenantId: user.tenantId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { reason: 'bad_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    // Successful login → reset counters, stamp metadata
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: input.ipAddress,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const roleCodes = user.roles.map((ur) => ur.role.code);
    const tokens = await this.tokens.issuePair(
      { id: user.id, tenantId: user.tenantId, email: user.email },
      roleCodes,
      { ipAddress: input.ipAddress, userAgent: input.userAgent },
    );

    await this.audit.record({
      action: 'auth.login.success',
      userId: user.id,
      tenantId: user.tenantId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await this.outbox.appendStandalone({
      tenantId: user.tenantId,
      eventType: 'iam.user.logged_in',
      aggregateType: 'user',
      aggregateId: user.id,
      payload: { userId: user.id, ipAddress: input.ipAddress },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: roleCodes,
      },
    };
  }

  async refresh(input: RefreshInput): Promise<IssueTokensResult> {
    const result = await this.tokens.rotateRefresh(input.refreshToken, {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    if (!result) throw new UnauthorizedException('Refresh token invalid or expired');
    return result;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeRefresh(refreshToken);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async recordFailedAttempt(userId: string, current: number): Promise<void> {
    const nextCount = current + 1;
    const shouldLock = nextCount >= MAX_FAILED_LOGINS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: nextCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      },
    });
    if (shouldLock) {
      this.logger.warn(`User ${userId} locked after ${nextCount} failed attempts`);
    }
  }
}
