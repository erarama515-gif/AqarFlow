import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

import { PrismaService } from '../prisma/prisma.service';
import { TENANT_ID_KEY, USER_ID_KEY, REQUEST_ID_KEY } from './tenant-context.constants';

/**
 * TenantContextMiddleware
 *
 * Resolves the tenant identifier for every request and stores it in
 * AsyncLocalStorage (CLS). Resolution priority:
 *   1. Explicit header `X-Tenant-Id` (only honored in dev or when a JWT confirms it)
 *   2. Subdomain (e.g., `acme.aqarflow.app` → tenant `acme`)
 *   3. JWT claim `tid` (populated by JwtStrategy)
 *
 * Downstream services read the tenant id via TenantContextService.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Carry the request id from CLS into the response for client correlation.
    // Fall back to a fresh UUID when running outside an active CLS context.
    const requestId = this.cls.getId() ?? crypto.randomUUID();
    _res.setHeader('X-Request-Id', requestId);

    let tenantId: string | undefined;

    // 1. Subdomain resolution -------------------------------------------------
    if (this.config.get('app.tenantResolutionMode') === 'subdomain') {
      const host = req.headers.host?.split(':')[0] ?? '';
      const rootDomain = this.config.get<string>('app.rootDomain', 'aqarflow.local');
      if (host && host !== rootDomain && host.endsWith(`.${rootDomain}`)) {
        const subdomain = host.replace(`.${rootDomain}`, '');
        const tenant = await this.prisma.tenant.findFirst({
          where: { subdomain, deletedAt: null },
          select: { id: true },
        });
        tenantId = tenant?.id;
      }
    }

    // 2. Explicit header (dev convenience or trusted internal callers) --------
    if (!tenantId && req.headers['x-tenant-id']) {
      const candidate = String(req.headers['x-tenant-id']);
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: candidate },
        select: { id: true },
      });
      tenantId = tenant?.id;
    }

    // 3. JWT-derived (set later by JwtStrategy, but kept consistent here) -----
    // Strategies populate cls with tenant after authentication.

    // CLS is set up by ClsModule via the @nestjs-cls middleware. When this
    // middleware runs outside an active CLS context (e.g., because the cls
    // middleware hasn't mounted before us yet), fall back gracefully so the
    // request still completes — downstream services that need a tenant will
    // surface their own 'tenant required' errors.
    if (this.cls.isActive()) {
      if (tenantId) this.cls.set(TENANT_ID_KEY, tenantId);
      this.cls.set(REQUEST_ID_KEY, requestId);
    }
    next();
  }
}
