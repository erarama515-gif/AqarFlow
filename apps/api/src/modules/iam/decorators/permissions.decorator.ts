import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../infrastructure/jwt-auth.guard';
import { PermissionsGuard } from '../infrastructure/permissions.guard';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route as accessible without authentication. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Require one or more permissions for the decorated route. Equivalent to
 * applying both JwtAuthGuard and PermissionsGuard.
 */
export const RequirePermissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    UseGuards(JwtAuthGuard, PermissionsGuard),
    SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions),
  );

/** Auth required but no specific permission check. */
export const Authenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(ApiBearerAuth('jwt'), UseGuards(JwtAuthGuard));
