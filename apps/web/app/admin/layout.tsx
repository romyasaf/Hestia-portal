import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireRoles } from "@/server/auth/session";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/finance", label: "Finance" }
] as const;

const SECONDARY_NAV = [
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/owners", label: "Owners" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/check-in-inventory", label: "Check-in inventory" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/", label: "Marketing site" }
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRoles(["admin", "super_admin"]);

  return (
    <div className="portal-layout portal-admin">
      <header className="portal-header border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="portal-badge">Admin</span>
              <Link href="/admin/dashboard" className="portal-home-link">
                Hestia Portal
              </Link>
            </div>
            <SignOutButton />
          </div>

          <nav className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Admin primary">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground"
            aria-label="Admin tools"
          >
            {SECONDARY_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="font-medium hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
