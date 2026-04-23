/**
 * Coarse portal access — mirrors docs/roles-permissions.md at route level.
 * Row-level rules (active lease, assignments) belong in server actions / route handlers.
 */
const ADMIN_LIKE = new Set(["admin", "super_admin"]);

export function canAccessTenantPortal(roles: readonly string[]): boolean {
  return roles.some((r) => r === "tenant" || ADMIN_LIKE.has(r));
}

export function canAccessStaffPortal(roles: readonly string[]): boolean {
  return roles.some((r) => r === "staff" || ADMIN_LIKE.has(r));
}

export function canAccessAdminPortal(roles: readonly string[]): boolean {
  return roles.some((r) => ADMIN_LIKE.has(r));
}

export function canAccessOwnerPortal(roles: readonly string[]): boolean {
  return roles.some((r) => r === "owner" || ADMIN_LIKE.has(r));
}
