import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { auditCrossPortalAccess } from "@/server/audit/cross-portal";
import { requireRoles } from "@/server/auth/session";
import { getOwnerPortalNavFlags } from "@/server/queries/owner-portal";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const session = await requireRoles(["owner", "admin", "super_admin"]);
  const h = await headers();
  auditCrossPortalAccess({
    userId: session.user.id,
    email: session.user.email,
    roles: session.user.roles ?? [],
    portal: "owner",
    path: "/owner",
    requestPath: h.get("x-pathname"),
    impersonationContext: h.get("x-impersonation-context")
  });

  const nav = await getOwnerPortalNavFlags(session.user.id);

  return (
    <div className="portal-layout portal-owner">
      <header className="portal-header">
        <div className="flex flex-wrap items-center gap-3">
          <span className="portal-badge">Owner</span>
          <Link href="/owner/dashboard" className="portal-home-link">
            Hestia Portal
          </Link>
        </div>
        <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Owner">
          <Link href="/owner/dashboard">Dashboard</Link>
          <Link href="/owner/buildings">Buildings</Link>
          {nav.showUnitsLeases ? (
            <>
              <Link href="/owner/units">Units</Link>
              <Link href="/owner/leases">Leases</Link>
            </>
          ) : null}
          <Link href="/owner/maintenance">Maintenance</Link>
          <Link href="/owner/financials">Financials</Link>
          <Link href="/owner/announcements">Announcements</Link>
          <Link href="/">Marketing site</Link>
          <SignOutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
