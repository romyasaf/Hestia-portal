import Link from "next/link";
import { getAdminOperationsHubCounts } from "@/server/queries/admin-operations-hub";
import { getAdminOperationsSnapshot } from "@/server/queries/admin-dashboard";

const MODULES = [
  {
    title: "Maintenance",
    description: "Tickets, assignments, quotes, and field status.",
    href: "/admin/maintenance",
    countKey: "maintenanceOpen" as const
  },
  {
    title: "Tenant requests",
    description: "Renewals, transfers, and handovers from the tenant portal.",
    href: "/admin/requests",
    countKey: "tenantRequestsPending" as const
  },
  {
    title: "Check-ins",
    description: "Move-in documentation and review workflow.",
    href: "/admin/checkins",
    countKey: "checkInsInFlight" as const
  },
  {
    title: "Checkouts",
    description: "Move-out scheduling, inspection, and deposit handling.",
    href: "/admin/checkouts",
    countKey: "checkoutsOpen" as const
  },
  {
    title: "Check-in issues",
    description: "Items raised at check-in that may need tickets or follow-up.",
    href: "/admin/checkins",
    countKey: "checkInIssuesUntriaged" as const,
    badge: "untriaged" as const
  }
] as const;

export default async function AdminOperationsPage() {
  const [counts, ops] = await Promise.all([getAdminOperationsHubCounts(), getAdminOperationsSnapshot()]);
  const nextVisit = ops.scheduledThisWeek[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/25 via-background to-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Control center</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Day-to-day property operations — maintenance, tenant moves, check-ins and checkouts. Scheduling and
            assignments live in each workspace.
          </p>
        </header>

        {nextVisit ? (
          <aside className="mt-10 rounded-2xl border border-border/70 bg-card/90 px-5 py-4 text-sm shadow-sm">
            <p className="font-medium text-foreground">Next scheduled visit</p>
            <p className="mt-1 text-muted-foreground">
              {nextVisit.ticketNo} · {nextVisit.title}
              <span className="mx-1.5 text-border">·</span>
              {new Date(nextVisit.appointmentAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
            <Link href={`/admin/maintenance/${nextVisit.id}`} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
              Open ticket
            </Link>
          </aside>
        ) : null}

        <nav className="mt-12 space-y-4" aria-label="Operations modules">
          {MODULES.map((m) => {
            const n = counts[m.countKey];
            const badge =
              "badge" in m && m.badge === "untriaged" ? `${n} untriaged` : `${n} open`;
            return (
              <Link
                key={m.title}
                href={m.href}
                className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm ring-1 ring-black/[0.02] transition-colors hover:border-foreground/15 hover:bg-card dark:ring-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{m.title}</h2>
                    <span className="rounded-full bg-muted/80 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                      {badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
                </div>
                <span className="text-sm font-semibold text-primary group-hover:underline sm:shrink-0">Open →</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
