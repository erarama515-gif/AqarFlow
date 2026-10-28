import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClsService } from 'nestjs-cls';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  TENANT_ID_KEY,
  USER_ID_KEY,
  USER_PERMISSIONS_KEY,
  USER_ROLES_KEY,
} from '../../../shared/tenant/tenant-context.constants';
import { AccessTokenPayload } from '../application/token.service';

/**
 * Validates the bearer JWT and primes the CLS store with the resolved
 * identity (tenant, user, roles, expanded permissions) so downstream
 * guards and services can read it without re-querying.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwt.accessSecret')!,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    // Quick sanity: user must still exist and be active.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
        tenant: { select: { id: true, status: true } },
      },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not active');
    }
    if (user.tenantId !== payload.tid) {
      throw new UnauthorizedException('Tenant mismatch');
    }

    const permissions = user.roles.flatMap((ur) => ur.role.permissions);
    const roleCodes = user.roles.map((ur) => ur.role.code);

    this.cls.set(TENANT_ID_KEY, user.tenantId);
    this.cls.set(USER_ID_KEY, user.id);
    this.cls.set(USER_ROLES_KEY, roleCodes);
    this.cls.set(USER_PERMISSIONS_KEY, permissions);

    return payload;
  }
}
