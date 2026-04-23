import { CreateReceiptForm } from "@/components/accounting/create-receipt-form";
import { ReceiptStatusSelect } from "@/components/accounting/receipt-status-select";
import { receiptPaymentLabel } from "@/lib/accounting/statuses";
import {
  listCheckoutOptionsForAccounting,
  listInvoiceOptionsForAccounting,
  listLeaseOptionsForAccounting,
  listReceiptsForAdmin,
  listTicketOptionsForAccounting
} from "@/server/queries/accounting";
import { cn } from "@/lib/utils";

export default async function AdminReceiptsPage() {
  const [receipts, leaseOptions, ticketOptions, invoiceOptions, checkoutOptions] = await Promise.all([
    listReceiptsForAdmin(),
    listLeaseOptionsForAccounting(),
    listTicketOptionsForAccounting(),
    listInvoiceOptionsForAccounting(),
    listCheckoutOptionsForAccounting()
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record money in with optional links to leases, tickets, or invoices. Update receipt status as you reconcile.
        </p>
      </header>

      <CreateReceiptForm
        leaseOptions={leaseOptions}
        ticketOptions={ticketOptions}
        invoiceOptions={invoiceOptions}
        checkoutOptions={checkoutOptions}
      />

      {receipts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No receipts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Receipt #</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.receiptNo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.receivedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{r.amount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.leaseLabel ? <div>Lease: {r.leaseLabel}</div> : null}
                    {r.ticketLabel ? <div>Ticket: {r.ticketLabel}</div> : null}
                    {r.invoiceNo ? <div>Invoice: {r.invoiceNo}</div> : null}
                    {r.checkoutLabel ? <div>{r.checkoutLabel}</div> : null}
                    {r.category ? (
                      <div>
                        Cat: {r.category}
                        {r.subcategory ? ` / ${r.subcategory}` : ""}
                      </div>
                    ) : null}
                    {!r.leaseLabel && !r.ticketLabel && !r.invoiceNo && !r.checkoutLabel && !r.category ? "—" : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                          r.paymentStatus === "voided" ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {receiptPaymentLabel(r.paymentStatus)}
                      </span>
                      <ReceiptStatusSelect receiptId={r.id} value={r.paymentStatus} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
