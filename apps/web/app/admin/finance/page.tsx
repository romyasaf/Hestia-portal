import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { FinanceWorkspace } from "@/components/admin/finance/finance-workspace";
import {
  listCheckoutOptionsForAccounting,
  listInvoiceOptionsForAccounting,
  listJobOptionsForAccounting,
  listLeaseOptionsForAccounting,
  listPropertyOptionsForAccounting,
  listTicketOptionsForAccounting,
  listUnpaidInvoicesForAdmin
} from "@/server/queries/accounting";
import {
  countUnlinkedExpenses,
  countUnlinkedReceipts,
  getFinancePeriodKpis,
  getFinanceRecentTransactions,
  getFinanceTrendSeries,
  getFinanceUtcRange,
  invoiceScopeWhere,
  listFinanceExpenseRows,
  listFinanceIncomeRows,
  listFinanceInvoicePayments,
  listFinanceScopePropertyOptions,
  listFinanceScopeTenantOptions,
  listFinanceScopeUnitOptions,
  parseFinanceTimeView,
  resolveFinanceScope
} from "@/server/queries/finance-admin";

function tabFromSearch(sp: Record<string, string | string[] | undefined>): "overview" | "income" | "expenses" | "payments" {
  const raw = typeof sp.tab === "string" ? sp.tab : "";
  if (raw === "income" || raw === "expenses" || raw === "payments" || raw === "overview") {
    return raw;
  }
  return "overview";
}

async function FinanceShell({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const initialTab = tabFromSearch(searchParams);
  const timeView = parseFinanceTimeView(searchParams);
  const issueRange = getFinanceUtcRange(timeView);
  const scopeCtx = await resolveFinanceScope(searchParams);
  const invoiceExtra = invoiceScopeWhere(scopeCtx.scope);

  const [
    kpis,
    trend,
    orphanReceipts,
    orphanExpenses,
    incomeRows,
    expenseRows,
    paymentRows,
    recentTransactions,
    unpaidInvoices,
    leaseOptions,
    ticketOptions,
    invoiceOptions,
    checkoutOptions,
    propertyOptions,
    jobOptions,
    propertyScopeOptions,
    unitScopeOptions,
    tenantScopeOptions
  ] = await Promise.all([
    getFinancePeriodKpis(timeView, scopeCtx),
    getFinanceTrendSeries(timeView, scopeCtx.scope),
    countUnlinkedReceipts(),
    countUnlinkedExpenses(),
    listFinanceIncomeRows(timeView, scopeCtx.scope, 120),
    listFinanceExpenseRows(timeView, scopeCtx.scope, 120),
    listFinanceInvoicePayments(timeView, scopeCtx.scope, 100),
    getFinanceRecentTransactions(timeView, scopeCtx.scope, 20),
    listUnpaidInvoicesForAdmin(40, { start: issueRange.start, end: issueRange.expenseEndDate }, invoiceExtra),
    listLeaseOptionsForAccounting(),
    listTicketOptionsForAccounting(),
    listInvoiceOptionsForAccounting(),
    listCheckoutOptionsForAccounting(),
    listPropertyOptionsForAccounting(),
    listJobOptionsForAccounting(),
    listFinanceScopePropertyOptions(),
    listFinanceScopeUnitOptions(),
    listFinanceScopeTenantOptions()
  ]);

  return (
    <FinanceWorkspace
      initialTab={initialTab}
      timeView={timeView}
      scopeKind={scopeCtx.scopeKind}
      scopeLabel={scopeCtx.scopeLabel}
      propertyScopeOptions={propertyScopeOptions}
      unitScopeOptions={unitScopeOptions}
      tenantScopeOptions={tenantScopeOptions}
      kpis={kpis}
      trend={trend}
      orphanReceipts={orphanReceipts}
      orphanExpenses={orphanExpenses}
      incomeRows={incomeRows}
      expenseRows={expenseRows}
      paymentRows={paymentRows}
      recentTransactions={recentTransactions}
      unpaidInvoices={unpaidInvoices}
      leaseOptions={leaseOptions}
      ticketOptions={ticketOptions}
      invoiceOptions={invoiceOptions}
      checkoutOptions={checkoutOptions}
      propertyOptions={propertyOptions}
      jobOptions={jobOptions}
    />
  );
}

export default function AdminFinancePage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Loading finance…</div>}
    >
      <FinanceShell searchParams={searchParams} />
    </Suspense>
  );
}
