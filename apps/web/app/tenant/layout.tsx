import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TenantPortalNav, tenantPortalHomeHref } from "@/components/tenant/tenant-portal-nav";
import { auditCrossPortalAccess } from "@/server/audit/cross-portal";
import { requireRoles } from "@/server/auth/session";
import { getTenantPortalContext } from "@/server/queries/tenant-portal-context";

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const session = await requireRoles(["tenant", "admin", "super_admin"]);
  const portalCtx = session.user.roles?.includes("tenant")
    ? await getTenantPortalContext(session.user.id)
    : null;
  const h = await headers();
  auditCrossPortalAccess({
    userId: session.user.id,
    email: session.user.email,
    roles: session.user.roles ?? [],
    portal: "tenant",
    path: "/tenant",
    requestPath: h.get("x-pathname"),
    impersonationContext: h.get("x-impersonation-context")
  });

  return (
    <div className="portal-layout portal-tenant">
      <header className="portal-header">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="portal-badge">Tenant</span>
            <Link
              href={portalCtx ? tenantPortalHomeHref(portalCtx) : "/tenant/dashboard"}
              className="portal-home-link"
            >
              Hestia Portal
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {portalCtx ? (
              <TenantPortalNav ctx={portalCtx} />
            ) : (
              <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Tenant">
                <Link href="/tenant/dashboard">Dashboard</Link>
                <Link href="/">Marketing site</Link>
              </nav>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
