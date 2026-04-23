import { auth } from "@/auth";

export type ActionGuardResult =
  | { ok: true; userId: string; roles: string[]; staffPermissions: string[] }
  | { ok: false; error: "unauthorized" | "forbidden" };

/** For server actions: no redirects — return errors for forms. */
export async function guardActionRoles(allowed: readonly string[]): Promise<ActionGuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  const roles = session.user.roles ?? [];
  if (!roles.some((r) => allowed.includes(r))) {
    return { ok: false, error: "forbidden" };
  }
  const staffPermissions = session.user.staffPermissions ?? [];
  return { ok: true, userId: session.user.id, roles, staffPermissions };
}
