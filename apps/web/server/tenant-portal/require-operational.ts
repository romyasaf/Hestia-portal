import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import type { ActiveLeaseForTenant } from "@/server/queries/leases";
import { getTenantPortalContext } from "@/server/queries/tenant-portal-context";

/** Active-lease tenant routes: onboarding and former tenants are redirected away. */
export async function requireTenantOperationalLease(): Promise<{
  userId: string;
  lease: ActiveLeaseForTenant;
}> {
  const session = await requireSession();
  const ctx = await getTenantPortalContext(session.user.id);
  if (ctx.mode === "onboarding") {
    redirect("/tenant/onboarding");
  }
  if (ctx.mode === "inactive" || !ctx.operationalLease) {
    redirect("/tenant/account");
  }
  return { userId: session.user.id, lease: ctx.operationalLease };
}
