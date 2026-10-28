import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  REQUEST_ID_KEY,
  TENANT_ID_KEY,
  USER_ID_KEY,
  USER_PERMISSIONS_KEY,
  USER_ROLES_KEY,
} from './tenant-context.constants';

/**
 * TenantContextService
 *
 * Convenience wrapper around the CLS store. Any code path that needs the
 * current tenant or user should read from here rather than threading the
 * value through every method signature.
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  // --- Reads -----------------------------------------------------------------
  get tenantId(): string | undefined {
    return this.cls.get<string>(TENANT_ID_KEY);
  }

  requireTenantId(): string {
    const id = this.tenantId;
    if (!id) throw new Error('Tenant context not initialised');
    return id;
  }

  get userId(): string | undefined {
    return this.cls.get<string>(USER_ID_KEY);
  }

  get requestId(): string | undefined {
    return this.cls.get<string>(REQUEST_ID_KEY);
  }

  get roles(): string[] {
    return this.cls.get<string[]>(USER_ROLES_KEY) ?? [];
  }

  get permissions(): string[] {
    return this.cls.get<string[]>(USER_PERMISSIONS_KEY) ?? [];
  }

  // --- Writes (used by auth strategies) --------------------------------------
  setTenantId(id: string): void {
    this.cls.set(TENANT_ID_KEY, id);
  }

  setUserId(id: string): void {
    this.cls.set(USER_ID_KEY, id);
  }

  setRoles(roles: string[]): void {
    this.cls.set(USER_ROLES_KEY, roles);
  }

  setPermissions(perms: string[]): void {
    this.cls.set(USER_PERMISSIONS_KEY, perms);
  }

  hasPermission(perm: string): boolean {
    const perms = this.permissions;
    // Exact match or super-admin wildcard
    if (perms.includes(perm) || perms.includes('*')) return true;
    const [resource, action] = perm.split(':');
    // Resource-wide wildcard (e.g., 'lead:*' covers 'lead:create')
    if (perms.includes(`${resource}:*`)) return true;
    // Broader implies narrower scope (e.g., 'lead:read' covers 'lead:read.own').
    // Conversely, holding only ':own' should NOT grant the unscoped permission.
    if (action?.includes('.')) {
      const base = action.split('.')[0]; // 'read.own' -> 'read'
      if (perms.includes(`${resource}:${base}`)) return true;
    }
    return false;
  }
}
