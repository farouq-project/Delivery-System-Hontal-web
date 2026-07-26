/**
 * Centralised role → display label map.
 *
 * Database role slugs are never renamed — only the presentation layer changes here.
 * Import this instead of defining local ROLE_LABELS in each page.
 *
 * Example:
 *   import { getRoleLabel } from '@/lib/roles';
 *   getRoleLabel('dispatcher')  // → 'Admin'
 */

export const ROLE_LABELS: Record<string, string> = {
  super_admin:    'Platform Admin',
  developer:      'Developer',
  owner:          'Owner',
  merchant_owner: 'Owner',
  dispatcher:     'Admin',
  driver:         'Driver',
  kasir:          'Kasir',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Roles that can access merchant owner-level settings. */
export const OWNER_ROLES = ['merchant_owner', 'developer', 'super_admin'] as const;

/** Roles allowed to log in to the merchant dashboard. */
export const DASHBOARD_ROLES = ['merchant_owner', 'developer', 'super_admin', 'dispatcher'] as const;
