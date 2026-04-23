/**
 * Staff portal permission codes (stored in `staff_permission_grants.permission_code`).
 * Absence of any grant row for a staff user means all codes are allowed (legacy behaviour).
 */
export const STAFF_PORTAL_PERMISSIONS = [
  "staff.dashboard",
  "staff.maintenance",
  "staff.announcements"
] as const;

export type StaffPortalPermission = (typeof STAFF_PORTAL_PERMISSIONS)[number];

export const STAFF_PORTAL_PERMISSION_LABELS: Record<StaffPortalPermission, string> = {
  "staff.dashboard": "Field dashboard (summary & queues)",
  "staff.maintenance": "Maintenance tickets (view, update, quotes)",
  "staff.announcements": "Announcements"
};

export function isAdminLikeRole(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export function isStaffOnlyRole(roles: readonly string[]): boolean {
  return roles.includes("staff") && !isAdminLikeRole(roles);
}

export function allStaffPortalPermissions(): StaffPortalPermission[] {
  return [...STAFF_PORTAL_PERMISSIONS];
}

export function isStaffPortalPermission(code: string): code is StaffPortalPermission {
  return (STAFF_PORTAL_PERMISSIONS as readonly string[]).includes(code);
}

export function staffHasPortalPermission(
  roles: readonly string[],
  staffPermissions: readonly string[],
  code: StaffPortalPermission
): boolean {
  if (isAdminLikeRole(roles)) {
    return true;
  }
  return staffPermissions.includes(code);
}
