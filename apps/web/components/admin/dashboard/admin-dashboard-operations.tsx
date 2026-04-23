import Link from "next/link";
import type { AdminOperationsSnapshot } from "@/server/queries/admin-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  ops: AdminOperationsSnapshot;
  className?: string;
};

function timeShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminDashboardOperations({ ops, className }: Props) {
  const occ =
    ops.occupancyPercent != null ? `${ops.occupancyPercent}% occupied (active leases / units)` : "Add units to track occupancy";

  return (
    <section className={cn("space-y-5", className)} aria-labelledby="dash-ops-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-ops-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Operations overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Field rhythm, occupancy, and latest leasing — summaries only.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Link href="/admin/maintenance" className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted">
            Maintenance
          </Link>
          <Link href="/admin/requests" className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted">
            Requests
          </Link>
          <Link href="/admin/leases" className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted">
            Leases
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Maintenance in progress</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">{ops.maintenanceInProgress}</p>
          <p className="mt-2 text-xs text-muted-foreground">Tickets currently marked in progress.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Occupancy snapshot</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
            {ops.occupancyPercent != null ? `${ops.occupancyPercent}%` : "—"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{occ}</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s visits</p>
          {ops.todaysAppointments.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No scheduled maintenance visits today.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {ops.todaysAppointments.map((t) => (
                <li key={t.id} className="text-sm">
                  <Link href={`/admin/maintenance/${t.id}`} className="font-medium text-foreground hover:underline">
                    {t.ticketNo}
                  </Link>
                  <span className="text-muted-foreground"> · {t.title}</span>
                  <p className="text-xs text-muted-foreground">{timeShort(t.appointmentAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Upcoming week</h3>
            <span className="text-[11px] text-muted-foreground">Scheduled maintenance</span>
          </div>
          {ops.scheduledThisWeek.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No visits in the next several days.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ops.scheduledThisWeek.map((t) => (
                <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/admin/maintenance/${t.id}`} className="font-medium text-foreground hover:underline">
                      {t.ticketNo}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.propertyName}
                      {t.unitNumber ? ` · Unit ${t.unitNumber}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeShort(t.appointmentAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Recent lease activity</h3>
            <Link href="/admin/leases" className="text-xs font-medium text-primary hover:underline">
              All leases
            </Link>
          </div>
          {ops.recentLeases.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No leases recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ops.recentLeases.map((l) => (
                <li key={l.id} className="text-sm">
                  <Link href={`/admin/leases/${l.id}`} className="font-medium text-foreground hover:underline">
                    {l.tenantName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{l.label}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
