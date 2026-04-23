/**
 * Coarse path → which role codes can enter the segment.
 * `super_admin` is treated as all-access in middleware (see matchPortalAccess).
 * Per-record checks (lease scope) happen in server actions, not only here.
 */

export const PORTAL_ROLES: Record<"/admin" | "/tenant" | "/staff" | "/owner", string[]> = {
  "/admin": ["admin", "super_admin"],
  "/tenant": ["tenant"],
  "/staff": ["staff"],
  "/owner": ["owner"]
} as const;

/**
 * @returns `true` if the user is allowed to continue to this path
 */
export function canAccessPath(pathname: string, roles: string[] | undefined): boolean {
  const list = roles ?? [];
  if (list.includes("super_admin")) {
    return true;
  }
  for (const [prefix, allowed] of Object.entries(PORTAL_ROLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return allowed.some((r) => list.includes(r));
    }
  }
  return true;
}

export function isPortalPath(pathname: string): boolean {
  for (const prefix of Object.keys(PORTAL_ROLES) as (keyof typeof PORTAL_ROLES)[]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * First home route after sign-in when no `callbackUrl` is provided.
 * One Hestia Portal login — pick the highest-precedence portal when a user has multiple roles.
 * Order: admin / super_admin → staff → owner → tenant → marketing home.
 */
export function defaultPortalForRoles(roles: string[]): string {
  if (roles.includes("super_admin") || roles.includes("admin")) {
    return "/admin/dashboard";
  }
  if (roles.includes("staff")) {
    return "/staff/dashboard";
  }
  if (roles.includes("owner")) {
    return "/owner/dashboard";
  }
  if (roles.includes("tenant")) {
    return "/tenant/dashboard";
  }
  return "/";
}
