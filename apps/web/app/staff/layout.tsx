import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { staffHasPortalPermission } from "@/lib/rbac/staff-permissions";
import { auditCrossPortalAccess } from "@/server/audit/cross-portal";
import { requireRoles } from "@/server/auth/session";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const session = await requireRoles(["staff", "admin", "super_admin"]);
  const roles = session.user.roles ?? [];
  const perms = session.user.staffPermissions ?? [];
  const showDash = staffHasPortalPermission(roles, perms, "staff.dashboard");
  const showTickets = staffHasPortalPermission(roles, perms, "staff.maintenance");
  const showAnnounce = staffHasPortalPermission(roles, perms, "staff.announcements");
  const h = await headers();
  auditCrossPortalAccess({
    userId: session.user.id,
    email: session.user.email,
    roles: session.user.roles ?? [],
    portal: "staff",
    path: "/staff",
    requestPath: h.get("x-pathname"),
    impersonationContext: h.get("x-impersonation-context")
  });

  return (
    <div className="portal-layout portal-staff">
      <header className="portal-header">
        <div className="flex flex-wrap items-center gap-3">
          <span className="portal-badge">Staff</span>
          <Link href={showDash ? "/staff/dashboard" : "/staff/profile"} className="portal-home-link">
            Hestia Portal
          </Link>
        </div>
        <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Staff">
          {showDash ? (
            <Link href="/staff/dashboard">Dashboard</Link>
          ) : null}
          {showTickets ? <Link href="/staff/tickets">Tickets</Link> : null}
          {showAnnounce ? <Link href="/staff/announcements">Announcements</Link> : null}
          <Link href="/staff/profile">Profile</Link>
          <Link href="/">Marketing site</Link>
          <SignOutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
