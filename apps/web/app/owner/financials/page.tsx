import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { getOwnerFinancialSummary, listOwnedPropertiesForUser } from "@/server/queries/owner-portal";

export default async function OwnerFinancialsPage() {
  const session = await requireSession();
  const [properties, summary] = await Promise.all([
    listOwnedPropertiesForUser(session.user.id),
    getOwnerFinancialSummary(session.user.id, 90)
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Financial summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown only for buildings where an administrator has enabled owner financial access.
        </p>
      </header>

      {properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">No owned buildings.</p>
      ) : !summary ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          <p>
            No financial data is shared yet. Ask your administrator to enable{" "}
            <strong>Owner portal financials</strong> on specific properties in{" "}
            <Link href="/admin/properties" className="text-primary hover:underline">
              Admin → Properties & owner portal
            </Link>
            .
          </p>
        </div>
      ) : (
        <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs text-muted-foreground">Rolling window since {summary.sinceLabel}</p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Receipts</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.receiptsSum}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses paid</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.expensesPaidSum}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses pending</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.expensesPendingSum}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Managed buildings include tenant lease and unit-linked flows. Operator (fixed-lease) buildings only include
            building-level expenses and non-lease company payments (for example tickets or jobs), not tenant rent
            receipts.
          </p>
        </section>
      )}
    </main>
  );
}
