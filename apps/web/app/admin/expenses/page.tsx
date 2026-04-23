import { CreateExpenseForm } from "@/components/accounting/create-expense-form";
import { ExpenseStatusSelect } from "@/components/accounting/expense-status-select";
import { expensePaymentLabel } from "@/lib/accounting/statuses";
import {
  listCheckoutOptionsForAccounting,
  listExpensesForAdmin,
  listJobOptionsForAccounting,
  listLeaseOptionsForAccounting,
  listPropertyOptionsForAccounting,
  listTicketOptionsForAccounting
} from "@/server/queries/accounting";
import { cn } from "@/lib/utils";

export default async function AdminExpensesPage() {
  const [expenses, propertyOptions, leaseOptions, ticketOptions, jobOptions, checkoutOptions] = await Promise.all([
    listExpensesForAdmin(),
    listPropertyOptionsForAccounting(),
    listLeaseOptionsForAccounting(),
    listTicketOptionsForAccounting(),
    listJobOptionsForAccounting(),
    listCheckoutOptionsForAccounting()
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track payables with links to properties, leases, or tickets. Use status to mirror approval and settlement.
        </p>
      </header>

      <CreateExpenseForm
        propertyOptions={propertyOptions}
        leaseOptions={leaseOptions}
        ticketOptions={ticketOptions}
        jobOptions={jobOptions}
        checkoutOptions={checkoutOptions}
      />

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Subcategory</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{e.expenseDate}</td>
                  <td className="px-4 py-3 font-medium">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.subcategory ?? "—"}</td>
                  <td className="px-4 py-3">{e.amount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.vendorName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.propertyLabel ? <div>{e.propertyLabel}</div> : null}
                    {e.leaseLabel ? <div>{e.leaseLabel}</div> : null}
                    {e.ticketNo ? <div>Ticket {e.ticketNo}</div> : null}
                    {e.checkoutLabel ? <div>{e.checkoutLabel}</div> : null}
                    {!e.propertyLabel && !e.leaseLabel && !e.ticketNo && !e.checkoutLabel ? "—" : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                          e.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                            : e.paymentStatus === "voided"
                              ? "bg-muted text-muted-foreground"
                              : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {expensePaymentLabel(e.paymentStatus)}
                      </span>
                      <ExpenseStatusSelect expenseId={e.id} value={e.paymentStatus} />
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
