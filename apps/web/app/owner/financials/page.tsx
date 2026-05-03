import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import {
  getOwnerFinancialSummary,
  listOwnedPropertiesForUser,
  listOwnerOperatorContractPayments
} from "@/server/queries/owner-portal";
import { expensePaymentLabel } from "@/lib/accounting/statuses";

export default async function OwnerFinancialsPage() {
  const session = await requireSession();
  const [properties, summary, operatorPayments] = await Promise.all([
    listOwnedPropertiesForUser(session.user.id),
    getOwnerFinancialSummary(session.user.id, 90),
    listOwnerOperatorContractPayments(session.user.id, 365)
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
            Managed buildings include tenant lease and unit-linked flows. Operator (fixed-lease) buildings show company
            payments to you from recorded <strong className="text-foreground">owner contracts</strong> only — not tenant
            rent or unit-level income.
          </p>
        </section>
      )}

      {operatorPayments.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Company payments (operator contracts)</h2>
          <p className="text-sm text-muted-foreground">
            Fixed-lease installments generated from your owner agreements with the company. Status updates when finance marks
            an installment paid.
          </p>
          <ul className="divide-y divide-border text-sm">
            {operatorPayments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{p.expenseDate}</span>
                  <span className="ml-2">{p.scopeLabel}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono tabular-nums">{p.amount}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{expensePaymentLabel(p.paymentStatus)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
