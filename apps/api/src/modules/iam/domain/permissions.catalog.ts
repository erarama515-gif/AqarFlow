/**
 * Permission catalog
 *
 * Single source of truth for every permission string the system understands.
 * Permissions follow `<resource>:<action>` (or `<resource>:<action>.own`).
 *
 * Conventions:
 *   `*` (alone) → super-admin wildcard
 *   `lead:*`   → all actions on leads
 *   `lead:read.own` → can read records you own (scoped guard enforces it)
 */

export const PERMISSIONS = {
  // Tenant settings ----------------------------------------------------------
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  TENANT_DELETE: 'tenant:delete',

  // Branch -------------------------------------------------------------------
  BRANCH_READ: 'branch:read',
  BRANCH_CREATE: 'branch:create',
  BRANCH_UPDATE: 'branch:update',
  BRANCH_DELETE: 'branch:delete',

  // IAM ----------------------------------------------------------------------
  USER_READ: 'user:read',
  USER_INVITE: 'user:invite',
  USER_UPDATE: 'user:update',
  USER_SUSPEND: 'user:suspend',
  USER_DELETE: 'user:delete',
  ROLE_READ: 'role:read',
  ROLE_MANAGE: 'role:manage',

  // Lead ---------------------------------------------------------------------
  LEAD_READ_ALL: 'lead:read',
  LEAD_READ_OWN: 'lead:read.own',
  LEAD_CREATE: 'lead:create',
  LEAD_UPDATE: 'lead:update',
  LEAD_DELETE: 'lead:delete',
  LEAD_ASSIGN: 'lead:assign',
  LEAD_CONVERT: 'lead:convert',
  LEAD_BULK_IMPORT: 'lead:bulk-import',
  LEAD_SETTINGS: 'lead:settings',

  // Contact ------------------------------------------------------------------
  CONTACT_READ: 'contact:read',
  CONTACT_CREATE: 'contact:create',
  CONTACT_UPDATE: 'contact:update',
  CONTACT_DELETE: 'contact:delete',
  CONTACT_MERGE: 'contact:merge',
  CONTACT_EXPORT: 'contact:export',

  // Property -----------------------------------------------------------------
  PROPERTY_READ: 'property:read',
  PROPERTY_CREATE: 'property:create',
  PROPERTY_UPDATE: 'property:update',
  PROPERTY_DELETE: 'property:delete',
  PROPERTY_PUBLISH: 'property:publish',
  PROPERTY_RESERVE: 'property:reserve',

  // Booking ------------------------------------------------------------------
  BOOKING_READ_ALL: 'booking:read',
  BOOKING_READ_OWN: 'booking:read.own',
  BOOKING_CREATE: 'booking:create',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_SIGN_SPA: 'booking:sign-spa',
  BOOKING_REFUND: 'booking:refund',

  // Deal ---------------------------------------------------------------------
  DEAL_READ_ALL: 'deal:read',
  DEAL_READ_OWN: 'deal:read.own',
  DEAL_CREATE: 'deal:create',
  DEAL_UPDATE: 'deal:update',
  DEAL_DELETE: 'deal:delete',
  DEAL_WIN: 'deal:win',
  DEAL_LOSE: 'deal:lose',
  PIPELINE_MANAGE: 'pipeline:manage',

  // Activity -----------------------------------------------------------------
  ACTIVITY_READ: 'activity:read',
  ACTIVITY_CREATE: 'activity:create',
  ACTIVITY_UPDATE: 'activity:update',
  ACTIVITY_DELETE: 'activity:delete',

  // Commission ---------------------------------------------------------------
  COMMISSION_READ_ALL: 'commission:read',
  COMMISSION_READ_OWN: 'commission:read.own',
  COMMISSION_RULES_MANAGE: 'commission:rules',
  COMMISSION_APPROVE: 'commission:approve',
  COMMISSION_PAY: 'commission:pay',

  // Reports ------------------------------------------------------------------
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
} as const;

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ---------------------------------------------------------------------------
// Built-in roles — seeded for every new tenant
// ---------------------------------------------------------------------------
export const BUILTIN_ROLES = {
  OWNER: {
    code: 'OWNER',
    name: 'Owner',
    permissions: ['*'] as string[],
  },
  ADMIN: {
    code: 'ADMIN',
    name: 'Administrator',
    permissions: [
      'tenant:*',
      'branch:*',
      'user:*',
      'role:*',
      'lead:*',
      'contact:*',
      'property:*',
      'deal:*',
      'activity:*',
      'commission:*',
      'pipeline:*',
      'report:*',
    ],
  },
  SALES_MANAGER: {
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    permissions: [
      'branch:read',
      'user:read',
      'lead:read',
      'lead:create',
      'lead:update',
      'lead:assign',
      'lead:convert',
      'lead:settings',
      'contact:read',
      'contact:create',
      'contact:update',
      'property:read',
      'property:create',
      'property:update',
      'property:publish',
      'property:reserve',
      'deal:read',
      'deal:create',
      'deal:update',
      'deal:win',
      'deal:lose',
      'pipeline:manage',
      'activity:read',
      'activity:create',
      'activity:update',
      'commission:read',
      'commission:approve',
      'report:read',
      'booking:read',
      'booking:create',
      'booking:update',
      'booking:sign-spa',
      'booking:refund',
    ],
  },
  AGENT: {
    code: 'AGENT',
    name: 'Agent',
    permissions: [
      'lead:read.own',
      'lead:create',
      'lead:update',
      'lead:convert',
      'contact:read',
      'contact:create',
      'contact:update',
      'property:read',
      'property:create',
      'property:update',
      'property:reserve',
      'deal:read.own',
      'deal:create',
      'deal:update',
      'activity:read',
      'activity:create',
      'activity:update',
      'commission:read.own',
      'booking:read.own',
      'booking:create',
      'booking:update',
      'booking:sign-spa',
    ],
  },
  MARKETING: {
    code: 'MARKETING',
    name: 'Marketing',
    permissions: [
      'lead:read',
      'lead:bulk-import',
      'lead:settings',
      'contact:read',
      'property:read',
      'report:read',
    ],
  },
  FINANCE: {
    code: 'FINANCE',
    name: 'Finance',
    permissions: [
      'deal:read',
      'commission:read',
      'commission:rules',
      'commission:approve',
      'commission:pay',
      'report:read',
      'report:export',
    ],
  },
  READ_ONLY: {
    code: 'READ_ONLY',
    name: 'Read Only',
    permissions: [
      'lead:read',
      'contact:read',
      'property:read',
      'deal:read',
      'activity:read',
      'report:read',
    ],
  },
} as const;

export type BuiltinRoleCode = keyof typeof BUILTIN_ROLES;
