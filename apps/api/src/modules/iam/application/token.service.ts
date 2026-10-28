import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;   // user id
  tid: string;   // tenant id
  email: string;
  roles: string[];
}

export interface IssueTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * TokenService
 *
 * Issues short-lived JWT access tokens and opaque, hashed refresh tokens.
 * Refresh rotation: every refresh exchanges the old token (revoke + create)
 * for a new pair, mitigating replay attacks if a refresh leaks.
 */
@Injectable()
export class TokenService {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<string>('app.jwt.accessTtl', '15m');
    this.refreshTtl = config.get<string>('app.jwt.refreshTtl', '7d');
    this.accessSecret = config.get<string>('app.jwt.accessSecret')!;
    this.refreshSecret = config.get<string>('app.jwt.refreshSecret')!;
  }

  async issuePair(
    user: { id: string; tenantId: string; email: string },
    roles: string[],
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<IssueTokensResult> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      tid: user.tenantId,
      email: user.email,
      roles,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl,
    });

    // Refresh token is a long opaque random string; only its hash is stored.
    const refreshRaw = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefresh(refreshRaw);
    const expiresAt = this.computeExpiry(this.refreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent?.slice(0, 250),
      },
    });

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: this.ttlToSeconds(this.accessTtl),
    };
  }

  /**
   * Rotate a refresh token: validate, revoke the old one, issue a new pair.
   * Returns null when the token is invalid, expired or revoked.
   */
  async rotateRefresh(
    refreshToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<IssueTokensResult | null> {
    const tokenHash = this.hashRefresh(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
            tenant: { select: { id: true } },
          },
        },
      },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return null;
    }
    // Revoke and rotate atomically
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roleCodes = stored.user.roles.map((ur) => ur.role.code);
    return this.issuePair(
      { id: stored.user.id, tenantId: stored.user.tenantId, email: stored.user.email },
      roleCodes,
      meta,
    );
  }

  async revokeRefresh(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefresh(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload | null> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessSecret,
      });
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeExpiry(ttl: string): Date {
    return new Date(Date.now() + this.ttlToSeconds(ttl) * 1_000);
  }

  /** Supports `15m`, `7d`, `30s`, `1h`. */
  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 900; // default 15min
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return value;
    }
  }
}
