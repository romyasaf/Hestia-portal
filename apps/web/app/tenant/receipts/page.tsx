import { invoicePaymentLabel, receiptPaymentLabel } from "@/lib/accounting/statuses";
import { listInvoicesAndReceiptsForTenantLease } from "@/server/queries/accounting";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";
import { cn } from "@/lib/utils";

export default async function TenantReceiptsPage() {
  const { userId, lease } = await requireTenantOperationalLease();
  const data = await listInvoicesAndReceiptsForTenantLease(userId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Receipts & invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invoices and official receipts recorded against your current lease.
        </p>
      </header>

      <>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Invoices</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unit {lease.unit.unitNumber} · {lease.building.name}
            </p>
            {data.invoices.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No invoices on file for this lease.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {data.invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{inv.invoiceNo}</span>
                      <p className="text-muted-foreground">
                        Issued {inv.issueDate} · Due {inv.dueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{inv.totalAmount}</p>
                      <p className="text-xs text-muted-foreground">Paid {inv.paidAmount}</p>
                      <span
                        className={cn(
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          inv.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-950"
                            : inv.paymentStatus === "overdue"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {invoicePaymentLabel(inv.paymentStatus)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Receipts</h2>
            {data.receipts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No receipts recorded for this lease yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border text-sm">
                {data.receipts.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{r.receiptNo}</span>
                      <p className="text-xs text-muted-foreground">{new Date(r.receivedAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{r.amount}</p>
                      <p className="text-xs text-muted-foreground">{r.method}</p>
                      <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                        {receiptPaymentLabel(r.paymentStatus)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
      </>
    </div>
  );
}
