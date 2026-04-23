import Link from "next/link";
import { requireStaffPortalPermission } from "@/server/auth/session";
import { getStaffWorkSummary } from "@/server/queries/staff-dashboard";

export default async function StaffDashboardPage() {
  const session = await requireStaffPortalPermission("staff.dashboard");
  const summary = await getStaffWorkSummary(session.user.id);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Field dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assigned work, upcoming visits, and high-priority queues for {session.user.email}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Upcoming schedule (14 days)</h2>
            <Link href="/staff/tickets" className="text-xs text-primary hover:underline">
              All tickets
            </Link>
          </div>
          {summary.scheduledSoon.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No scheduled appointments in the next two weeks.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {summary.scheduledSoon.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <div>
                    <Link href={`/staff/tickets/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.ticketNo}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t.title}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t.appointmentAt ? new Date(t.appointmentAt).toLocaleString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <h2 className="text-sm font-semibold">High / urgent — still open</h2>
          {summary.highPriorityOpen.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing in this queue.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {summary.highPriorityOpen.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/staff/tickets/${t.id}`} className="font-medium text-primary hover:underline">
                    {t.ticketNo}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{t.status}</span>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Open assigned tickets</h2>
        <p className="mt-1 text-xs text-muted-foreground">Excludes completed, cancelled, and rejected.</p>
        {summary.openTickets.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">You have no open assigned tickets.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {summary.openTickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/staff/tickets/${t.id}`} className="font-medium text-primary hover:underline">
                    {t.ticketNo}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{t.title}</span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Status visibility:</strong> ticket detail pages show allowed next
          steps, quotes, and scheduling controls based on your role and assignment. Terminal states:{" "}
          {["Completed", "Cancelled", "Rejected"].join(", ")}.
        </p>
      </section>
    </main>
  );
}
