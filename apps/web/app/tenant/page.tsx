import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getTenantPortalContext } from "@/server/queries/tenant-portal-context";

export default async function TenantIndexPage() {
  const session = await requireSession();
  const ctx = await getTenantPortalContext(session.user.id);
  if (ctx.mode === "onboarding") {
    redirect("/tenant/onboarding");
  }
  if (ctx.mode === "inactive") {
    redirect("/tenant/account");
  }
  redirect("/tenant/dashboard");
}
