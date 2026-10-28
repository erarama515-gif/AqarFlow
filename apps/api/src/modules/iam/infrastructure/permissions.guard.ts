import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ctx: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const hasAll = required.every((perm) => this.ctx.hasPermission(perm));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }
    return true;
  }
}
