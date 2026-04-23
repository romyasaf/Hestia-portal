import { RecordInvoicePaymentForm } from "@/components/accounting/record-invoice-payment-form";
import { invoicePaymentLabel } from "@/lib/accounting/statuses";
import { getAccountingReport, listUnpaidInvoicesForAdmin } from "@/server/queries/accounting";
import { cn } from "@/lib/utils";

export default async function AdminReportsPage() {
  const [report, unpaid] = await Promise.all([getAccountingReport(90), listUnpaidInvoicesForAdmin(30)]);

  const paymentFormInvoices = unpaid.map((i) => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    totalAmount: i.totalAmount,
    paidAmount: i.paidAmount
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Accounting reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot since {report.sinceLabel} (last 90 days) plus open receivables.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Receipts (non-voided)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{report.receiptsRecordedSum}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses paid</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{report.expensesPaidSum}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses pending</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{report.expensesPendingSum}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/25">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open invoices</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{report.unpaidInvoiceCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Outstanding ≈ {report.unpaidInvoiceAmount}</p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-base font-semibold">Expenses by category</h2>
          <p className="mt-1 text-xs text-muted-foreground">Same window as summary; excludes voided expenses.</p>
          {report.expenseByCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No categorized spend in this period.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.expenseByCategory.map((r) => (
                  <tr key={r.category} className="border-b border-border/80">
                    <td className="py-2">{r.category}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="mt-8 text-sm font-semibold">By category & subcategory</h3>
          <p className="mt-1 text-xs text-muted-foreground">Finer breakdown for the same period.</p>
          {report.expenseByCategorySubcategory.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No subcategory data.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Subcategory</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.expenseByCategorySubcategory.map((r) => (
                  <tr
                    key={`${r.category}-${r.subcategory ?? "none"}`}
                    className="border-b border-border/80"
                  >
                    <td className="py-2">{r.category}</td>
                    <td className="py-2 text-muted-foreground">{r.subcategory ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <RecordInvoicePaymentForm invoices={paymentFormInvoices} />
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-semibold">Open invoices</h2>
            {unpaid.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No unpaid / partial / overdue invoices.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {unpaid.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-mono text-xs">{i.invoiceNo}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        i.paymentStatus === "overdue"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {invoicePaymentLabel(i.paymentStatus)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Due {i.dueDate} · balance {i.balance}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
