import Link from "next/link";
import type { AdminOperationsSnapshot } from "@/server/queries/admin-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  ops: AdminOperationsSnapshot;
  className?: string;
};

function formatAppt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminDashboardToday({ ops, className }: Props) {
  const today = ops.todaysAppointments.slice(0, 5);
  const week = ops.scheduledThisWeek.slice(0, 4);
  const hasAny = today.length > 0 || week.length > 0 || ops.maintenanceInProgress > 0;

  if (!hasAny) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-border/60 bg-card/60 px-6 py-10 text-center shadow-sm",
          className
        )}
        aria-labelledby="dash-today-heading"
      >
        <h2 id="dash-today-heading" className="text-lg font-semibold tracking-tight text-foreground">
          Today &amp; upcoming
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          No scheduled maintenance visits in the next few days. Field work and appointments live in Operations.
        </p>
        <Link
          href="/admin/operations"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Open operations
        </Link>
      </section>
    );
  }

  return (
    <section
      className={cn("rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]", className)}
      aria-labelledby="dash-today-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-today-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Today &amp; upcoming
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Maintenance schedule snapshot — full queues and assignments are in Operations.
          </p>
        </div>
        <Link
          href="/admin/operations"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Operations hub
        </Link>
      </div>

      {ops.maintenanceInProgress > 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{ops.maintenanceInProgress}</span> ticket
          {ops.maintenanceInProgress === 1 ? "" : "s"} currently <span className="font-medium text-foreground">In Progress</span>
          .
        </p>
      ) : null}

      {today.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</h3>
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/50 bg-muted/10">
            {today.map((t) => (
              <li key={t.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t.ticketNo} · {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatAppt(t.appointmentAt)}</p>
                </div>
                <Link href={`/admin/maintenance/${t.id}`} className="text-xs font-semibold text-primary hover:underline sm:shrink-0">
                  View
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {week.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next 7 days</h3>
          <ul className="mt-3 space-y-2">
            {week.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 font-medium text-foreground">
                  {t.ticketNo} · {t.title}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatAppt(t.appointmentAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
