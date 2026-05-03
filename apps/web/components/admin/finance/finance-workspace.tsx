"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateExpenseForm } from "@/components/accounting/create-expense-form";
import { CreateReceiptForm } from "@/components/accounting/create-receipt-form";
import { ExpenseStatusSelect } from "@/components/accounting/expense-status-select";
import { InvoiceStatusSelect } from "@/components/accounting/invoice-status-select";
import { ReceiptStatusSelect } from "@/components/accounting/receipt-status-select";
import { expensePaymentLabel, invoicePaymentLabel, receiptPaymentLabel } from "@/lib/accounting/statuses";
import { formatFinanceMoney } from "@/lib/finance/format-money";
import { cn } from "@/lib/utils";
import type { UnpaidInvoiceRow } from "@/server/queries/accounting";
import type {
  FinanceExpenseRow,
  FinanceIncomeRow,
  FinanceOverviewTransaction,
  FinanceOwnerAutomationSummary,
  FinancePaymentRow,
  FinancePeriodKpis,
  FinanceScopeOption,
  FinanceScopeKind,
  FinanceTimeView,
  FinanceTrendPoint
} from "@/server/queries/finance-admin";

type Opt = { id: string; label: string };

export type FinanceWorkspaceProps = {
  initialTab: "overview" | "income" | "expenses" | "payments";
  timeView: FinanceTimeView;
  scopeKind: FinanceScopeKind;
  scopeLabel: string | null;
  propertyScopeOptions: FinanceScopeOption[];
  unitScopeOptions: FinanceScopeOption[];
  tenantScopeOptions: FinanceScopeOption[];
  kpis: FinancePeriodKpis;
  ownerAutomationSummary: FinanceOwnerAutomationSummary;
  trend: FinanceTrendPoint[];
  orphanReceipts: number;
  orphanExpenses: number;
  incomeRows: FinanceIncomeRow[];
  expenseRows: FinanceExpenseRow[];
  paymentRows: FinancePaymentRow[];
  recentTransactions: FinanceOverviewTransaction[];
  unpaidInvoices: UnpaidInvoiceRow[];
  leaseOptions: Opt[];
  ticketOptions: Opt[];
  invoiceOptions: Opt[];
  checkoutOptions: Opt[];
  propertyOptions: Opt[];
  jobOptions: Opt[];
};

const TABS: { id: FinanceWorkspaceProps["initialTab"]; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "income", label: "Income" },
  { id: "expenses", label: "Expenses" },
  { id: "payments", label: "Payments / receipts" }
];

function FinanceScopeStrip({
  scopeKind,
  scopeLabel,
  propertyOptions,
  unitOptions,
  tenantOptions,
  onApplyScope
}: {
  scopeKind: FinanceScopeKind;
  scopeLabel: string | null;
  propertyOptions: FinanceScopeOption[];
  unitOptions: FinanceScopeOption[];
  tenantOptions: FinanceScopeOption[];
  onApplyScope: (kind: FinanceScopeKind, id?: string) => void;
}) {
  const [picker, setPicker] = useState<null | Exclude<FinanceScopeKind, "all">>(null);
  const [q, setQ] = useState("");

  const activeOptions =
    picker === "building" ? propertyOptions : picker === "unit" ? unitOptions : picker === "tenant" ? tenantOptions : [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      return activeOptions.slice(0, 80);
    }
    return activeOptions.filter((o) => o.label.toLowerCase().includes(s)).slice(0, 80);
  }, [activeOptions, q]);

  useEffect(() => {
    setPicker(null);
    setQ("");
  }, [scopeKind, scopeLabel]);

  return (
    <section className="mt-8" aria-label="Financial scope">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scope</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            { kind: "all" as const, label: "All" },
            { kind: "building" as const, label: "Building" },
            { kind: "unit" as const, label: "Unit" },
            { kind: "tenant" as const, label: "Tenant" }
          ] as const
        ).map((pill) => (
          <button
            key={pill.kind}
            type="button"
            onClick={() => {
              if (pill.kind === "all") {
                onApplyScope("all");
                setPicker(null);
                setQ("");
              } else {
                setPicker(pill.kind);
                setQ("");
              }
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              scopeKind === pill.kind
                ? "bg-foreground text-background shadow-sm"
                : "border border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {scopeKind !== "all" && scopeLabel ? (
        <p className="mt-3 text-sm text-foreground">
          <span className="font-medium">Active ·</span> {scopeLabel}
        </p>
      ) : null}

      {picker ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Search
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  picker === "building" ? "Building name or code…" : picker === "unit" ? "Unit or property…" : "Tenant name or email…"
                }
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPicker(null);
                setQ("");
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2 text-sm">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-muted-foreground">No matches.</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onApplyScope(picker, o.id)}
                    className="w-full rounded-md px-2 py-2 text-left hover:bg-background"
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function FinanceWorkspace(props: FinanceWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initialFromUrl =
    urlTab === "income" || urlTab === "expenses" || urlTab === "payments" || urlTab === "overview"
      ? urlTab
      : props.initialTab;

  const [tab, setTab] = useState<FinanceWorkspaceProps["initialTab"]>(initialFromUrl);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "income" || t === "expenses" || t === "payments" || t === "overview") {
      setTab(t);
    }
  }, [searchParams]);

  const setTabAndUrl = useCallback(
    (next: FinanceWorkspaceProps["initialTab"]) => {
      setTab(next);
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      if (!p.get("view")) {
        p.set("view", props.timeView);
      }
      router.replace(`/admin/finance?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, props.timeView]
  );

  const setTimeViewAndUrl = useCallback(
    (next: FinanceTimeView) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", next);
      if (!p.get("tab")) {
        p.set("tab", tab);
      }
      router.replace(`/admin/finance?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, tab]
  );

  const applyScopeToUrl = useCallback(
    (nextKind: FinanceScopeKind, scopeId?: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (!p.get("view")) {
        p.set("view", props.timeView);
      }
      if (!p.get("tab")) {
        p.set("tab", tab);
      }
      if (nextKind === "all" || !scopeId) {
        p.delete("scope");
        p.delete("scopeId");
      } else {
        p.set("scope", nextKind);
        p.set("scopeId", scopeId);
      }
      router.replace(`/admin/finance?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, props.timeView, tab]
  );

  const k = props.kpis;
  const summary = useMemo(
    () => ({
      income: formatFinanceMoney(k.incomeTotal),
      expense: formatFinanceMoney(k.expenseTotal),
      net: formatFinanceMoney(k.netProfit),
      payroll: formatFinanceMoney(k.payrollTotal),
      pending: String(k.pendingPaymentsCount),
      overdue: String(k.overdueInvoicesCount)
    }),
    [k]
  );

  const periodScope =
    props.timeView === "monthly"
      ? "Receipts and expenses dated in this calendar month (UTC)."
      : "Receipts and expenses dated in this calendar year (UTC).";

  const scopeSentence =
    props.scopeKind === "all"
      ? "All buildings, units, and tenants."
      : props.scopeLabel
        ? `Filtered to ${props.scopeLabel}.`
        : "Filtered scope.";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/25 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-border/60 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Finance</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Track income, expenses, and payment status across leases, maintenance, contracting jobs, and property
            spend — operational, not full accounting.
          </p>
        </header>

        <section className="mt-8" aria-label="Reporting period">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">View</p>
          <div
            className="mt-3 inline-flex rounded-full border border-border/80 bg-muted/30 p-1 shadow-sm"
            role="group"
            aria-label="Monthly or yearly totals"
          >
            <button
              type="button"
              onClick={() => setTimeViewAndUrl("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                props.timeView === "monthly"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTimeViewAndUrl("yearly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                props.timeView === "yearly"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
            </button>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">{k.periodLabel}</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{periodScope}</p>
        </section>

        <FinanceScopeStrip
          scopeKind={props.scopeKind}
          scopeLabel={props.scopeLabel}
          propertyOptions={props.propertyScopeOptions}
          unitOptions={props.unitScopeOptions}
          tenantOptions={props.tenantScopeOptions}
          onApplyScope={applyScopeToUrl}
        />

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Period KPIs">
          {[
            {
              label: "Total income",
              value: summary.income,
              hint: `Receipts in period · ${scopeSentence}`
            },
            {
              label: "Total expenses",
              value: summary.expense,
              hint: `Non-voided in period · ${scopeSentence}`
            },
            {
              label: "Net profit",
              value: summary.net,
              hint: `Income − expenses · ${scopeSentence}`,
              emphasize: true
            },
            {
              label: "Payroll",
              value: summary.payroll,
              hint: `Payroll-tagged expenses · ${scopeSentence}`
            }
          ].map((card) => (
            <div
              key={card.label}
              className={cn(
                "rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm",
                card.emphasize && "ring-1 ring-foreground/10"
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </section>

        <nav
          className="mt-10 flex flex-wrap gap-2 border-b border-border/60 pb-4"
          aria-label="Finance sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabAndUrl(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <Link href="/admin/reports" className="text-muted-foreground hover:text-foreground hover:underline">
              Legacy reports
            </Link>
            <Link href="/admin/receipts" className="text-muted-foreground hover:text-foreground hover:underline">
              Receipts hub
            </Link>
            <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground hover:underline">
              Expenses hub
            </Link>
          </div>
        </nav>

        <div className="mt-8 space-y-10">
          {tab === "overview" ? (
            <OverviewPanel
              timeView={props.timeView}
              kpi={k}
              ownerAutomation={props.ownerAutomationSummary}
              trend={props.trend}
              recent={props.recentTransactions}
              unpaid={props.unpaidInvoices}
              orphanReceipts={props.orphanReceipts}
              orphanExpenses={props.orphanExpenses}
              scopeSentence={scopeSentence}
              onGo={(t) => setTabAndUrl(t)}
            />
          ) : null}

          {tab === "income" ? (
            <section className="space-y-6">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight">Record income</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receipts require a lease, ticket, invoice, checkout, or owner-contract link (API / automation).
                </p>
                <div className="mt-4">
                  <CreateReceiptForm
                    leaseOptions={props.leaseOptions}
                    ticketOptions={props.ticketOptions}
                    invoiceOptions={props.invoiceOptions}
                    checkoutOptions={props.checkoutOptions}
                  />
                </div>
              </div>
              <IncomeTable rows={props.incomeRows} periodHint={`${periodScope} ${scopeSentence}`} />
            </section>
          ) : null}

          {tab === "expenses" ? (
            <section className="space-y-6">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight">Record expense</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Link to property, lease, ticket, contracting job, or checkout — at least one anchor is required.
                </p>
                <div className="mt-4">
                  <CreateExpenseForm
                    propertyOptions={props.propertyOptions}
                    leaseOptions={props.leaseOptions}
                    ticketOptions={props.ticketOptions}
                    jobOptions={props.jobOptions}
                    checkoutOptions={props.checkoutOptions}
                  />
                </div>
              </div>
              <ExpensesTable rows={props.expenseRows} periodHint={`${periodScope} ${scopeSentence}`} />
            </section>
          ) : null}

          {tab === "payments" ? (
            <PaymentsPanel
              paymentRows={props.paymentRows}
              unpaid={props.unpaidInvoices}
              receipts={props.incomeRows}
              periodHint={`${periodScope} ${scopeSentence}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FinanceTrendBars({ points, timeView }: { points: FinanceTrendPoint[]; timeView: FinanceTimeView }) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense)));
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-emerald-600" aria-hidden />
          Income
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-rose-600" aria-hidden />
          Expenses
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {timeView === "monthly" ? "Daily totals in the selected month." : "Monthly totals across the year."}
      </p>
      <div className="mt-4 flex h-52 items-end gap-1 overflow-x-auto pb-1 pt-1">
        {points.map((p) => {
          const hi = (p.income / max) * 100;
          const he = (p.expense / max) * 100;
          return (
            <div key={p.key} className="flex min-w-[22px] flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                <div
                  className="w-[45%] min-h-[2px] rounded-t bg-emerald-600/90 transition-all dark:bg-emerald-500/90"
                  style={{ height: `${Math.max(hi, p.income > 0 ? 2 : 0)}%` }}
                  title={`Income ${formatFinanceMoney(p.income)}`}
                />
                <div
                  className="w-[45%] min-h-[2px] rounded-t bg-rose-600/90 transition-all dark:bg-rose-500/90"
                  style={{ height: `${Math.max(he, p.expense > 0 ? 2 : 0)}%` }}
                  title={`Expenses ${formatFinanceMoney(p.expense)}`}
                />
              </div>
              <span className="max-w-[4.5rem] truncate text-center text-[10px] leading-tight text-muted-foreground">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewPanel({
  timeView,
  kpi,
  ownerAutomation,
  trend,
  recent,
  unpaid,
  orphanReceipts,
  orphanExpenses,
  scopeSentence,
  onGo
}: {
  timeView: FinanceTimeView;
  kpi: FinancePeriodKpis;
  ownerAutomation: FinanceOwnerAutomationSummary;
  trend: FinanceTrendPoint[];
  recent: FinanceOverviewTransaction[];
  unpaid: UnpaidInvoiceRow[];
  orphanReceipts: number;
  orphanExpenses: number;
  scopeSentence: string;
  onGo: (t: FinanceWorkspaceProps["initialTab"]) => void;
}) {
  const overdueInv = unpaid.filter((u) => u.paymentStatus === "overdue").length;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Income vs expense · {kpi.periodLabel}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{scopeSentence}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Income</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatFinanceMoney(kpi.incomeTotal)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatFinanceMoney(kpi.expenseTotal)}</p>
            </div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/80"
              style={{
                width: `${Math.min(100, kpi.incomeTotal + kpi.expenseTotal > 0 ? (100 * kpi.incomeTotal) / (kpi.incomeTotal + kpi.expenseTotal) : 50)}%`
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share of recorded movement in this period; net is{" "}
            <span className="font-medium text-foreground">{formatFinanceMoney(kpi.netProfit)}</span>
            {kpi.payrollTotal > 0 ? (
              <>
                {" "}
                · payroll <span className="font-medium text-foreground">{formatFinanceMoney(kpi.payrollTotal)}</span>
              </>
            ) : null}
            .
          </p>
          <FinanceTrendBars points={trend} timeView={timeView} />
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Owner contracts · automation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scheduled owner payouts (pending or approved) and management revenue in this period. {scopeSentence}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Owner payouts due</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatFinanceMoney(ownerAutomation.ownerPayoutsPendingTotal)}</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Management revenue</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatFinanceMoney(ownerAutomation.managementRevenueTotal)}</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Commission income</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatFinanceMoney(ownerAutomation.managementCommissionTotal)}</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fixed management fees</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatFinanceMoney(ownerAutomation.managementFixedFeeTotal)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Recent transactions · {kpi.periodLabel}</h2>
            <button type="button" onClick={() => onGo("payments")} className="text-xs font-medium text-primary hover:underline">
              Open payments
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0">
                  <div>
                    <p className="font-medium text-foreground">{r.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {r.kind} · {r.subtitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{r.amount}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Pipeline snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Counts below are current operational load (not limited to {kpi.periodLabel}).
          </p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex justify-between gap-2">
              <span>Open invoice lines</span>
              <button type="button" className="font-medium text-foreground hover:underline" onClick={() => onGo("payments")}>
                {unpaid.length}
              </button>
            </li>
            <li className="flex justify-between gap-2">
              <span>Overdue invoices</span>
              <span className="font-medium text-amber-800 dark:text-amber-200">{overdueInv}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>All pending touchpoints</span>
              <span className="font-medium text-foreground">{kpi.pendingPaymentsCount}</span>
            </li>
          </ul>
        </div>

        {(orphanReceipts > 0 || orphanExpenses > 0) && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
            <p className="font-semibold">Data hygiene</p>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              {orphanReceipts > 0 ? `${orphanReceipts} receipt(s) have no operational link. ` : null}
              {orphanExpenses > 0 ? `${orphanExpenses} expense(s) have no anchor — edit or close in the hubs.` : null}
              New entries require links.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-muted/30 p-5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Verification</p>
          <p className="mt-2 leading-relaxed">
            Use <strong className="text-foreground">Payments / receipts</strong> to reconcile bank confirmations and
            set receipt or invoice status to paid, failed, or overdue as you verify.
          </p>
        </div>
      </div>
    </div>
  );
}

type SortDir = "asc" | "desc";

function ThSort({
  label,
  active,
  dir,
  onClick
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {active ? <span className="text-[10px] font-normal normal-case tabular-nums">{dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );
}

function nextSort<K extends string>(prev: { key: K; dir: SortDir }, key: K): { key: K; dir: SortDir } {
  if (prev.key !== key) {
    const defaultDesc = key === "date" || key === "amount";
    return { key, dir: defaultDesc ? "desc" : "asc" };
  }
  return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
}

function IncomeTable({ rows, periodHint }: { rows: FinanceIncomeRow[]; periodHint: string }) {
  type Key = "date" | "receiptNo" | "source" | "linkLabel" | "amount" | "method" | "status";
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>({ key: "date", dir: "desc" });

  const sorted = useMemo(() => {
    const mult = sort.dir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) * mult;
    const cmpNum = (a: number, b: number) => (a - b) * mult;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case "date":
          return cmpNum(new Date(a.date).getTime(), new Date(b.date).getTime());
        case "amount":
          return cmpNum(Number(a.amount), Number(b.amount));
        case "receiptNo":
          return cmpStr(a.receiptNo, b.receiptNo);
        case "source":
          return cmpStr(a.source, b.source);
        case "linkLabel":
          return cmpStr(a.linkLabel, b.linkLabel);
        case "method":
          return cmpStr(a.method, b.method);
        case "status":
          return cmpStr(a.status, b.status);
        default:
          return 0;
      }
    });
  }, [rows, sort]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Income ledger</h2>
        <p className="mt-1 text-sm text-muted-foreground">Receipts with source classification · {periodHint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">
            <tr>
              <ThSort
                label="Receipt"
                active={sort.key === "receiptNo"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "receiptNo"))}
              />
              <ThSort
                label="Date"
                active={sort.key === "date"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "date"))}
              />
              <ThSort
                label="Source"
                active={sort.key === "source"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "source"))}
              />
              <ThSort
                label="Linked record"
                active={sort.key === "linkLabel"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "linkLabel"))}
              />
              <ThSort
                label="Amount"
                active={sort.key === "amount"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "amount"))}
              />
              <ThSort
                label="Method"
                active={sort.key === "method"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "method"))}
              />
              <ThSort
                label="Status"
                active={sort.key === "status"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "status"))}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{r.receiptNo}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">
                  {r.source}
                  {r.source === "Unlinked" ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
                      Fix
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[240px] px-4 py-3 text-muted-foreground">{r.linkLabel}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{r.amount}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{receiptPaymentLabel(r.status)}</span>
                    <ReceiptStatusSelect receiptId={r.id} value={r.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">No receipts in this period.</p> : null}
    </div>
  );
}

function ExpensesTable({ rows, periodHint }: { rows: FinanceExpenseRow[]; periodHint: string }) {
  type Key = "date" | "category" | "linkLabel" | "amount" | "supplier" | "status";
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>({ key: "date", dir: "desc" });

  const sorted = useMemo(() => {
    const mult = sort.dir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) * mult;
    const cmpNum = (a: number, b: number) => (a - b) * mult;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case "date":
          return cmpStr(a.date, b.date);
        case "amount":
          return cmpNum(Number(a.amount), Number(b.amount));
        case "category":
          return cmpStr(a.category, b.category);
        case "linkLabel":
          return cmpStr(a.linkLabel, b.linkLabel);
        case "supplier":
          return cmpStr(a.supplier ?? "", b.supplier ?? "");
        case "status":
          return cmpStr(a.status, b.status);
        default:
          return 0;
      }
    });
  }, [rows, sort]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Expense ledger</h2>
        <p className="mt-1 text-sm text-muted-foreground">Linked operational costs · {periodHint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">
            <tr>
              <ThSort
                label="Date"
                active={sort.key === "date"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "date"))}
              />
              <ThSort
                label="Category"
                active={sort.key === "category"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "category"))}
              />
              <ThSort
                label="Linked record"
                active={sort.key === "linkLabel"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "linkLabel"))}
              />
              <ThSort
                label="Amount"
                active={sort.key === "amount"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "amount"))}
              />
              <ThSort
                label="Supplier"
                active={sort.key === "supplier"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "supplier"))}
              />
              <ThSort
                label="Status"
                active={sort.key === "status"}
                dir={sort.dir}
                onClick={() => setSort((p) => nextSort(p, "status"))}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                <td className="px-4 py-3 font-medium">{r.category}</td>
                <td className="max-w-[260px] px-4 py-3 text-muted-foreground">{r.linkLabel}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{r.amount}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.supplier ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{expensePaymentLabel(r.status)}</span>
                    <ExpenseStatusSelect expenseId={r.id} value={r.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">No expenses in this period.</p> : null}
    </div>
  );
}

function PaymentsPanel({
  paymentRows,
  unpaid,
  receipts,
  periodHint
}: {
  paymentRows: FinancePaymentRow[];
  unpaid: UnpaidInvoiceRow[];
  receipts: FinanceIncomeRow[];
  periodHint: string;
}) {
  type UnpaidKey = "invoiceNo" | "balance" | "dueDate" | "status";
  const [unpaidSort, setUnpaidSort] = useState<{ key: UnpaidKey; dir: SortDir }>({ key: "dueDate", dir: "asc" });

  type PayKey = "paidAt" | "invoiceNo" | "amount" | "method";
  const [paySort, setPaySort] = useState<{ key: PayKey; dir: SortDir }>({ key: "paidAt", dir: "desc" });

  type RcKey = "receiptNo" | "date" | "amount" | "method";
  const [rcSort, setRcSort] = useState<{ key: RcKey; dir: SortDir }>({ key: "date", dir: "desc" });

  const unpaidSorted = useMemo(() => {
    const mult = unpaidSort.dir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) * mult;
    const cmpNum = (a: number, b: number) => (a - b) * mult;
    const bal = (s: string) => Number(String(s).replace(/[^\d.-]/g, "")) || 0;
    return [...unpaid].sort((a, b) => {
      switch (unpaidSort.key) {
        case "invoiceNo":
          return cmpStr(a.invoiceNo, b.invoiceNo);
        case "balance":
          return cmpNum(bal(a.balance), bal(b.balance));
        case "dueDate":
          return cmpStr(a.dueDate, b.dueDate);
        case "status":
          return cmpStr(a.paymentStatus, b.paymentStatus);
        default:
          return 0;
      }
    });
  }, [unpaid, unpaidSort]);

  const paymentsSorted = useMemo(() => {
    const mult = paySort.dir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) * mult;
    const cmpNum = (a: number, b: number) => (a - b) * mult;
    return [...paymentRows].sort((a, b) => {
      switch (paySort.key) {
        case "paidAt":
          return cmpNum(new Date(a.paidAt).getTime(), new Date(b.paidAt).getTime());
        case "invoiceNo":
          return cmpStr(a.invoiceNo, b.invoiceNo);
        case "amount":
          return cmpNum(Number(a.amount), Number(b.amount));
        case "method":
          return cmpStr(a.method, b.method);
        default:
          return 0;
      }
    });
  }, [paymentRows, paySort]);

  const receiptsSorted = useMemo(() => {
    const mult = rcSort.dir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) * mult;
    const cmpNum = (a: number, b: number) => (a - b) * mult;
    return [...receipts].sort((a, b) => {
      switch (rcSort.key) {
        case "receiptNo":
          return cmpStr(a.receiptNo, b.receiptNo);
        case "date":
          return cmpNum(new Date(a.date).getTime(), new Date(b.date).getTime());
        case "amount":
          return cmpNum(Number(a.amount), Number(b.amount));
        case "method":
          return cmpStr(a.method, b.method);
        default:
          return 0;
      }
    });
  }, [receipts, rcSort]);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Invoice balances</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open balances on invoices <span className="font-medium text-foreground">issued</span> in the selected
            period. {periodHint}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">
              <tr>
                <ThSort
                  label="Invoice"
                  active={unpaidSort.key === "invoiceNo"}
                  dir={unpaidSort.dir}
                  onClick={() => setUnpaidSort((p) => nextSort(p, "invoiceNo"))}
                />
                <ThSort
                  label="Balance"
                  active={unpaidSort.key === "balance"}
                  dir={unpaidSort.dir}
                  onClick={() => setUnpaidSort((p) => nextSort(p, "balance"))}
                />
                <ThSort
                  label="Due"
                  active={unpaidSort.key === "dueDate"}
                  dir={unpaidSort.dir}
                  onClick={() => setUnpaidSort((p) => nextSort(p, "dueDate"))}
                />
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Verification
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {unpaidSorted.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{u.invoiceNo}</td>
                  <td className="px-4 py-3 tabular-nums">{u.balance}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.dueDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{invoicePaymentLabel(u.paymentStatus)}</span>
                      <InvoiceStatusSelect invoiceId={u.id} value={u.paymentStatus} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {unpaid.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No open invoice balances in this period.</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Payment confirmations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cash applied to invoices in the selected period (immutable log). {periodHint}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">
              <tr>
                <ThSort
                  label="Paid at"
                  active={paySort.key === "paidAt"}
                  dir={paySort.dir}
                  onClick={() => setPaySort((p) => nextSort(p, "paidAt"))}
                />
                <ThSort
                  label="Invoice"
                  active={paySort.key === "invoiceNo"}
                  dir={paySort.dir}
                  onClick={() => setPaySort((p) => nextSort(p, "invoiceNo"))}
                />
                <ThSort
                  label="Amount"
                  active={paySort.key === "amount"}
                  dir={paySort.dir}
                  onClick={() => setPaySort((p) => nextSort(p, "amount"))}
                />
                <ThSort
                  label="Method"
                  active={paySort.key === "method"}
                  dir={paySort.dir}
                  onClick={() => setPaySort((p) => nextSort(p, "method"))}
                />
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Reference
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Invoice status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paymentsSorted.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.paidAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{p.amount}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.referenceNo ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{invoicePaymentLabel(p.invoiceStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paymentRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No invoice payments in this period.</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Receipt verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">Receipts received in the selected period. {periodHint}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground">
              <tr>
                <ThSort
                  label="Receipt"
                  active={rcSort.key === "receiptNo"}
                  dir={rcSort.dir}
                  onClick={() => setRcSort((p) => nextSort(p, "receiptNo"))}
                />
                <ThSort
                  label="Date"
                  active={rcSort.key === "date"}
                  dir={rcSort.dir}
                  onClick={() => setRcSort((p) => nextSort(p, "date"))}
                />
                <ThSort
                  label="Amount"
                  active={rcSort.key === "amount"}
                  dir={rcSort.dir}
                  onClick={() => setRcSort((p) => nextSort(p, "amount"))}
                />
                <ThSort
                  label="Method"
                  active={rcSort.key === "method"}
                  dir={rcSort.dir}
                  onClick={() => setRcSort((p) => nextSort(p, "method"))}
                />
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {receiptsSorted.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.receiptNo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{r.amount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                  <td className="px-4 py-3">
                    <ReceiptStatusSelect receiptId={r.id} value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {receipts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No receipts in this period.</p>
        ) : null}
      </div>
    </div>
  );
}
