import { auth } from "@/auth";
import {
  isAdminLikeRole,
  type StaffPortalPermission
} from "@/lib/rbac/staff-permissions";
import { redirect } from "next/navigation";

/** Active Auth.js session or redirect to login (server components / server actions). */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/**
 * Require at least one allowed role code (from `user_roles` / JWT).
 * Call from server layouts and server actions — never rely on the client alone.
 */
export async function requireRoles(allowed: readonly string[]) {
  const session = await requireSession();
  const roles = session.user.roles ?? [];
  const ok = roles.some((r) => allowed.includes(r));
  if (!ok) {
    redirect("/login?error=access");
  }
  return session;
}

/**
 * Staff portal: require a specific portal permission. Admins / super_admins bypass.
 * Others are sent to profile with a query flag (no dedicated error page yet).
 */
export async function requireStaffPortalPermission(permission: StaffPortalPermission) {
  const session = await requireRoles(["staff", "admin", "super_admin"]);
  const roles = session.user.roles ?? [];
  if (isAdminLikeRole(roles)) {
    return session;
  }
  const perms = session.user.staffPermissions ?? [];
  if (!perms.includes(permission)) {
    redirect("/staff/profile?notice=staff_permission");
  }
  return session;
}
