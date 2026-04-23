import Link from "next/link";
import type { AdminDashboardKpis, AdminFinanceSnapshot } from "@/server/queries/admin-dashboard";
import { formatDashboardMoney } from "@/server/queries/admin-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  finance: AdminFinanceSnapshot;
  kpis: AdminDashboardKpis;
  className?: string;
};

export function AdminDashboardFinance({ finance, kpis, className }: Props) {
  return (
    <section className={cn("space-y-5", className)} aria-labelledby="dash-finance-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-finance-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Finance snapshot
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Month-to-date movement and latest entries — not a full ledger.
          </p>
        </div>
        <Link
          href="/admin/finance"
          className="inline-flex h-9 items-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          View full finance
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-muted/25 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Receipts (MTD)</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatDashboardMoney(kpis.receiptsMonthTotal)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/25 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expenses (MTD)</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatDashboardMoney(kpis.expensesMonthTotal)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/25 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Unpaid invoices</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{kpis.unpaidInvoices}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent receipts</h3>
            <Link href="/admin/receipts" className="text-xs font-medium text-primary hover:underline">
              Open
            </Link>
          </div>
          {finance.receipts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No receipts yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {finance.receipts.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{r.primary}</p>
                    <p className="text-xs text-muted-foreground">{r.secondary}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums text-foreground">{formatDashboardMoney(r.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">{r.dateLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent expenses</h3>
            <Link href="/admin/expenses" className="text-xs font-medium text-primary hover:underline">
              Open
            </Link>
          </div>
          {finance.expenses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {finance.expenses.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{e.primary}</p>
                    <p className="text-xs text-muted-foreground">{e.secondary}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums text-foreground">{formatDashboardMoney(e.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">{e.dateLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
