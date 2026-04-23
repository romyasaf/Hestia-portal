import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import {
  getOwnerDashboardMode,
  getOwnerFinancialSummary,
  listOwnedPropertiesForUser,
  listOwnerLeases,
  listOwnerOccupancy,
  listOwnerTickets
} from "@/server/queries/owner-portal";

export default async function OwnerDashboardPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const mode = await getOwnerDashboardMode(userId);
  const properties = await listOwnedPropertiesForUser(userId);

  const [financials, tickets, occupancy, leases] = await Promise.all([
    getOwnerFinancialSummary(userId, 90),
    listOwnerTickets(userId),
    mode === "operator_only" ? Promise.resolve([]) : listOwnerOccupancy(userId),
    mode === "operator_only" ? Promise.resolve([]) : listOwnerLeases(userId)
  ]);

  const occupied = occupancy.filter((o) => o.leaseId).length;
  const vacant = occupancy.filter((o) => !o.leaseId && o.status.toLowerCase() === "available").length;

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Owner dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "operator_only"
            ? "You have operator (fixed-lease) buildings: building-level view, maintenance, and agreed financials only."
            : "Buildings where you are the building-level owner, plus buildings containing a unit you own directly."}
        </p>
      </header>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No buildings assigned</p>
          <p className="mt-2">
            Ask your administrator to assign you as building-level owner on a building, or as direct owner on a unit.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buildings</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{properties.length}</p>
            </div>
            {mode === "operator_only" ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unit, tenant, and lease data are not available for operator contracts. Use{" "}
                  <Link href="/owner/buildings" className="text-primary hover:underline">
                    Buildings
                  </Link>
                  ,{" "}
                  <Link href="/owner/maintenance" className="text-primary hover:underline">
                    Maintenance
                  </Link>
                  , and{" "}
                  <Link href="/owner/financials" className="text-primary hover:underline">
                    Financials
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Units (tracked)</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{occupancy.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Occupied units</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{occupied}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Vacant (available): {vacant}</p>
                </div>
              </>
            )}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open maintenance</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {tickets.filter((t) => !["Completed", "Cancelled", "Rejected"].includes(t.status)).length}
              </p>
              <p className="mt-1 text-xs">
                <Link href="/owner/maintenance" className="text-primary hover:underline">
                  View tickets
                </Link>
              </p>
            </div>
          </section>

          {financials ? (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Financial snapshot (permitted scope)</h2>
                <Link href="/owner/financials" className="text-xs text-primary hover:underline">
                  Details
                </Link>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Since {financials.sinceLabel} · 90-day window</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Receipts</dt>
                  <dd className="font-semibold tabular-nums">{financials.receiptsSum}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expenses (paid)</dt>
                  <dd className="font-semibold tabular-nums">{financials.expensesPaidSum}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expenses (pending)</dt>
                  <dd className="font-semibold tabular-nums">{financials.expensesPendingSum}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              Financial summary is hidden until an administrator enables{" "}
              <strong>Owner portal financials</strong> for at least one of your buildings.
            </section>
          )}

          <section className="grid gap-8 lg:grid-cols-2">
            {mode !== "operator_only" ? (
              <div>
                <h2 className="text-sm font-semibold">Recent leases</h2>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {leases.slice(0, 6).map((l) => (
                    <li key={l.leaseId} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        {l.propertyName} · Unit {l.unitNumber}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{l.status}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs">
                  <Link href="/owner/leases" className="text-primary hover:underline">
                    All leases
                  </Link>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Leases & tenants</p>
                <p className="mt-1">Not shown for operator (fixed-lease) buildings.</p>
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold">Latest maintenance</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {tickets.slice(0, 6).map((t) => (
                  <li key={t.id} className="py-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.ticketNo}</span> · {t.title}
                    <span className="ml-2 text-xs text-muted-foreground">{t.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
