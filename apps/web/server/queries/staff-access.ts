import { prisma } from "@/lib/prisma";

/** Staff with no grant rows may do everything (legacy). Otherwise `staff.maintenance` is required. */
export async function userMayReceiveMaintenanceAssignments(userId: string): Promise<boolean> {
  const u = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      userRoles: { some: { role: { code: "staff" } } }
    },
    select: {
      staffPermissionGrants: { select: { permissionCode: true } }
    }
  });
  if (!u) {
    return false;
  }
  if (u.staffPermissionGrants.length === 0) {
    return true;
  }
  return u.staffPermissionGrants.some((g) => g.permissionCode === "staff.maintenance");
}
