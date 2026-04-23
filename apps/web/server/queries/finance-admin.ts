import { Prisma } from "@prisma/client";
import {
  expenseScopeWhere,
  financeScopeQuerySuffix,
  invoiceScopeWhere,
  parseFinanceScopeFromSearchParams,
  receiptScopeWhere,
  type FinanceScopeDiscriminant,
  type FinanceScopeKind
} from "@/lib/finance/scope";
import { formatFinanceMoney } from "@/lib/finance/format-money";
import { prisma } from "@/lib/prisma";

export type FinanceScopeContext = {
  scope: FinanceScopeDiscriminant;
  scopeKind: FinanceScopeKind;
  scopeLabel: string | null;
};

export const FINANCE_SCOPE_ALL: FinanceScopeContext = {
  scope: { kind: "all" },
  scopeKind: "all",
  scopeLabel: null
};

export { formatFinanceMoney, invoiceScopeWhere, parseFinanceScopeFromSearchParams };
export type { FinanceScopeDiscriminant, FinanceScopeKind } from "@/lib/finance/scope";

export async function resolveFinanceScope(
  sp: Record<string, string | string[] | undefined>
): Promise<FinanceScopeContext> {
  const parsed = parseFinanceScopeFromSearchParams(sp);
  if (parsed.kind === "all") {
    return FINANCE_SCOPE_ALL;
  }
  if (parsed.kind === "building") {
    const row = await prisma.property.findUnique({
      where: { id: parsed.propertyId },
      select: { code: true, name: true }
    });
    if (!row) {
      return FINANCE_SCOPE_ALL;
    }
    return {
      scope: parsed,
      scopeKind: "building",
      scopeLabel: `${row.code} · ${row.name}`
    };
  }
  if (parsed.kind === "unit") {
    const row = await prisma.unit.findUnique({
      where: { id: parsed.unitId },
      select: { unitNumber: true, property: { select: { code: true, name: true } } }
    });
    if (!row) {
      return FINANCE_SCOPE_ALL;
    }
    return {
      scope: parsed,
      scopeKind: "unit",
      scopeLabel: `${row.property.code} · Unit ${row.unitNumber}`
    };
  }
  const row = await prisma.user.findUnique({
    where: { id: parsed.tenantUserId },
    select: { fullName: true, email: true }
  });
  if (!row) {
    return FINANCE_SCOPE_ALL;
  }
  return {
    scope: parsed,
    scopeKind: "tenant",
    scopeLabel: `${row.fullName} (${row.email})`
  };
}

export type FinanceScopeOption = { id: string; label: string };

export async function listFinanceScopePropertyOptions(): Promise<FinanceScopeOption[]> {
  const rows = await prisma.property.findMany({
    orderBy: [{ code: "asc" }],
    take: 400,
    select: { id: true, code: true, name: true }
  });
  return rows.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }));
}

export async function listFinanceScopeUnitOptions(): Promise<FinanceScopeOption[]> {
  const rows = await prisma.unit.findMany({
    orderBy: [{ property: { code: "asc" } }, { unitNumber: "asc" }],
    take: 600,
    select: { id: true, unitNumber: true, property: { select: { code: true, name: true } } }
  });
  return rows.map((u) => ({
    id: u.id,
    label: `${u.property.code} · Unit ${u.unitNumber} · ${u.property.name}`
  }));
}

export async function listFinanceScopeTenantOptions(): Promise<FinanceScopeOption[]> {
  const rows = await prisma.user.findMany({
    where: { userRoles: { some: { role: { code: "tenant" } } } },
    take: 500,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true }
  });
  return rows.map((u) => ({
    id: u.id,
    label: `${u.fullName} (${u.email})`
  }));
}

export type FinanceTimeView = "monthly" | "yearly";

export function parseFinanceTimeView(sp: Record<string, string | string[] | undefined>): FinanceTimeView {
  const raw = typeof sp.view === "string" ? sp.view.trim().toLowerCase() : "";
  if (raw === "yearly" || raw === "year") {
    return "yearly";
  }
  return "monthly";
}

/** Inclusive UTC range for receipts / payments (timestamptz) and invoice issue filters. */
export function getFinanceUtcRange(view: FinanceTimeView): {
  start: Date;
  end: Date;
  /** Last calendar day in range (UTC date) for `@db.Date` expense / invoice fields */
  expenseEndDate: Date;
  periodLabel: string;
} {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (view === "monthly") {
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    const expenseEndDate = new Date(Date.UTC(y, m + 1, 0));
    const periodLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      start
    );
    return { start, end, expenseEndDate, periodLabel };
  }
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
  const expenseEndDate = new Date(Date.UTC(y, 11, 31));
  return { start, end, expenseEndDate, periodLabel: String(y) };
}

/** Top-line finance KPIs for the selected period (month or year). */
export type FinancePeriodKpis = {
  view: FinanceTimeView;
  periodLabel: string;
  scopeKind: FinanceScopeKind;
  scopeLabel: string | null;
  incomeTotal: number;
  expenseTotal: number;
  netProfit: number;
  payrollTotal: number;
  /** Operational snapshot (not limited to the selected period). */
  pendingPaymentsCount: number;
  overdueInvoicesCount: number;
};

/** @deprecated Use FinancePeriodKpis */
export type FinanceMonthKpis = FinancePeriodKpis;

const voidedExpense: Prisma.ExpenseWhereInput = {
  NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
};

const voidedReceipt: Prisma.ReceiptWhereInput = {
  NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
};

const payrollExpense: Prisma.ExpenseWhereInput = {
  OR: [
    { category: { contains: "payroll", mode: "insensitive" } },
    { subcategory: { contains: "payroll", mode: "insensitive" } }
  ]
};

function receiptPeriodWhere(view: FinanceTimeView, scope: FinanceScopeDiscriminant): Prisma.ReceiptWhereInput {
  const { start, end } = getFinanceUtcRange(view);
  const extra = receiptScopeWhere(scope);
  return {
    AND: [{ receivedAt: { gte: start, lte: end } }, voidedReceipt, ...(extra ? [extra] : [])]
  };
}

function expensePeriodWhere(view: FinanceTimeView, scope: FinanceScopeDiscriminant): Prisma.ExpenseWhereInput {
  const { start, expenseEndDate } = getFinanceUtcRange(view);
  const extra = expenseScopeWhere(scope);
  return {
    AND: [
      { expenseDate: { gte: start, lte: expenseEndDate } },
      voidedExpense,
      ...(extra ? [extra] : [])
    ]
  };
}

export async function getFinancePeriodKpis(
  view: FinanceTimeView,
  scopeCtx: FinanceScopeContext = FINANCE_SCOPE_ALL
): Promise<FinancePeriodKpis> {
  const { periodLabel } = getFinanceUtcRange(view);
  const { scope, scopeKind, scopeLabel } = scopeCtx;
  const invExtra = invoiceScopeWhere(scope);

  const [
    receiptAgg,
    expenseAgg,
    payrollAgg,
    pendingReceipts,
    pendingExpenses,
    overdueInvoices
  ] = await Promise.all([
    prisma.receipt.aggregate({
      where: receiptPeriodWhere(view, scope),
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: expensePeriodWhere(view, scope),
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: {
        AND: [expensePeriodWhere(view, scope), payrollExpense]
      },
      _sum: { amount: true }
    }),
    prisma.receipt.count({
      where: {
        AND: [
          { paymentStatus: { equals: "pending", mode: "insensitive" } },
          ...(receiptScopeWhere(scope) ? [receiptScopeWhere(scope)!] : [])
        ]
      }
    }),
    prisma.expense.count({
      where: {
        AND: [
          {
            OR: [
              { paymentStatus: { equals: "pending", mode: "insensitive" } },
              { paymentStatus: { equals: "approved", mode: "insensitive" } }
            ]
          },
          ...(expenseScopeWhere(scope) ? [expenseScopeWhere(scope)!] : [])
        ]
      }
    }),
    prisma.invoice.count({
      where: {
        AND: [
          { paymentStatus: { equals: "overdue", mode: "insensitive" } },
          ...(invExtra ? [invExtra] : [])
        ]
      }
    })
  ]);

  const unpaidInvoices = await prisma.invoice.count({
    where: {
      AND: [
        {
          OR: [
            { paymentStatus: { equals: "unpaid", mode: "insensitive" } },
            { paymentStatus: { equals: "partial", mode: "insensitive" } }
          ]
        },
        ...(invExtra ? [invExtra] : [])
      ]
    }
  });

  const incomeTotal = Number(receiptAgg._sum.amount ?? 0);
  const expenseTotal = Number(expenseAgg._sum.amount ?? 0);
  const payrollTotal = Number(payrollAgg._sum.amount ?? 0);
  const pendingPaymentsCount = pendingReceipts + pendingExpenses + unpaidInvoices;

  return {
    view,
    periodLabel,
    scopeKind,
    scopeLabel,
    incomeTotal,
    expenseTotal,
    netProfit: incomeTotal - expenseTotal,
    payrollTotal,
    pendingPaymentsCount,
    overdueInvoicesCount: overdueInvoices
  };
}

export async function getFinanceMonthKpis(): Promise<FinancePeriodKpis> {
  return getFinancePeriodKpis("monthly", FINANCE_SCOPE_ALL);
}

export type FinanceTrendPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

function eachUtcDayInclusive(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const y0 = from.getUTCFullYear();
  const m0 = from.getUTCMonth();
  const d0 = from.getUTCDate();
  const y1 = to.getUTCFullYear();
  const m1 = to.getUTCMonth();
  const d1 = to.getUTCDate();
  let y = y0;
  let m = m0;
  let d = d0;
  for (;;) {
    out.push(new Date(Date.UTC(y, m, d)));
    if (y === y1 && m === m1 && d === d1) {
      break;
    }
    const dt = new Date(Date.UTC(y, m, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth();
    d = dt.getUTCDate();
  }
  return out;
}

function eachUtcMonthStartInYear(year: number): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(year, i, 1)));
}

function utcCalendarDayKey(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

function utcMonthStartKey(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function buildTrendFromScopedRows(
  view: FinanceTimeView,
  receipts: { receivedAt: Date; amount: unknown }[],
  expenses: { expenseDate: Date; amount: unknown }[]
): FinanceTrendPoint[] {
  const range = getFinanceUtcRange(view);
  const year = range.start.getUTCFullYear();
  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  if (view === "monthly") {
    for (const r of receipts) {
      const k = utcCalendarDayKey(r.receivedAt);
      incomeMap.set(k, (incomeMap.get(k) ?? 0) + Number(r.amount));
    }
    for (const e of expenses) {
      const k = utcCalendarDayKey(e.expenseDate);
      expenseMap.set(k, (expenseMap.get(k) ?? 0) + Number(e.amount));
    }
    const days = eachUtcDayInclusive(
      new Date(Date.UTC(year, range.start.getUTCMonth(), 1)),
      range.expenseEndDate
    );
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(day),
        income: incomeMap.get(key) ?? 0,
        expense: expenseMap.get(key) ?? 0
      };
    });
  }

  for (const r of receipts) {
    const k = utcMonthStartKey(r.receivedAt);
    incomeMap.set(k, (incomeMap.get(k) ?? 0) + Number(r.amount));
  }
  for (const e of expenses) {
    const k = utcMonthStartKey(e.expenseDate);
    expenseMap.set(k, (expenseMap.get(k) ?? 0) + Number(e.amount));
  }
  return eachUtcMonthStartInYear(year).map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(day),
      income: incomeMap.get(key) ?? 0,
      expense: expenseMap.get(key) ?? 0
    };
  });
}

export async function getFinanceTrendSeries(
  view: FinanceTimeView,
  scope: FinanceScopeDiscriminant = { kind: "all" }
): Promise<FinanceTrendPoint[]> {
  if (scope.kind !== "all") {
    const [receipts, expenses] = await Promise.all([
      prisma.receipt.findMany({
        where: receiptPeriodWhere(view, scope),
        select: { receivedAt: true, amount: true },
        take: 12_000
      }),
      prisma.expense.findMany({
        where: expensePeriodWhere(view, scope),
        select: { expenseDate: true, amount: true },
        take: 12_000
      })
    ]);
    return buildTrendFromScopedRows(view, receipts, expenses);
  }

  const { start, end, expenseEndDate } = getFinanceUtcRange(view);
  const year = start.getUTCFullYear();

  if (view === "monthly") {
    const expenseStartStr = start.toISOString().slice(0, 10);
    const expenseEndStr = expenseEndDate.toISOString().slice(0, 10);
    const [incomeRows, expenseRows] = await Promise.all([
      prisma.$queryRaw<{ bucket: Date; total: unknown }[]>(Prisma.sql`
        SELECT (received_at AT TIME ZONE 'UTC')::date AS bucket,
               COALESCE(SUM(amount), 0) AS total
        FROM receipts
        WHERE received_at >= ${start}
          AND received_at <= ${end}
          AND LOWER(TRIM(payment_status)) <> 'voided'
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ bucket: Date; total: unknown }[]>(Prisma.sql`
        SELECT expense_date::date AS bucket,
               COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE expense_date >= ${expenseStartStr}::date
          AND expense_date <= ${expenseEndStr}::date
          AND LOWER(TRIM(payment_status)) <> 'voided'
        GROUP BY 1
        ORDER BY 1
      `)
    ]);

    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    for (const r of incomeRows) {
      const k = r.bucket.toISOString().slice(0, 10);
      incomeMap.set(k, Number(r.total));
    }
    for (const r of expenseRows) {
      const k = r.bucket.toISOString().slice(0, 10);
      expenseMap.set(k, Number(r.total));
    }

    const days = eachUtcDayInclusive(
      new Date(Date.UTC(year, start.getUTCMonth(), 1)),
      expenseEndDate
    );
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(day),
        income: incomeMap.get(key) ?? 0,
        expense: expenseMap.get(key) ?? 0
      };
    });
  }

  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const yearExpenseEnd = new Date(Date.UTC(year, 11, 31));
  const yearExpenseStartStr = yearStart.toISOString().slice(0, 10);
  const yearExpenseEndStr = yearExpenseEnd.toISOString().slice(0, 10);

  const [incomeRows, expenseRows] = await Promise.all([
    prisma.$queryRaw<{ bucket: Date; total: unknown }[]>(Prisma.sql`
      SELECT date_trunc('month', received_at AT TIME ZONE 'UTC')::date AS bucket,
             COALESCE(SUM(amount), 0) AS total
      FROM receipts
      WHERE received_at >= ${yearStart}
        AND received_at <= ${yearEnd}
        AND LOWER(TRIM(payment_status)) <> 'voided'
      GROUP BY 1
      ORDER BY 1
    `),
    prisma.$queryRaw<{ bucket: Date; total: unknown }[]>(Prisma.sql`
      SELECT make_date(
               EXTRACT(YEAR FROM expense_date)::int,
               EXTRACT(MONTH FROM expense_date)::int,
               1
             ) AS bucket,
             COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE expense_date >= ${yearExpenseStartStr}::date
        AND expense_date <= ${yearExpenseEndStr}::date
        AND LOWER(TRIM(payment_status)) <> 'voided'
      GROUP BY 1
      ORDER BY 1
    `)
  ]);

  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();
  for (const r of incomeRows) {
    const k = r.bucket.toISOString().slice(0, 10);
    incomeMap.set(k, Number(r.total));
  }
  for (const r of expenseRows) {
    const k = r.bucket.toISOString().slice(0, 10);
    expenseMap.set(k, Number(r.total));
  }

  return eachUtcMonthStartInYear(year).map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(day),
      income: incomeMap.get(key) ?? 0,
      expense: expenseMap.get(key) ?? 0
    };
  });
}

export async function countUnlinkedReceipts(): Promise<number> {
  return prisma.receipt.count({
    where: {
      leaseId: null,
      ticketId: null,
      invoiceId: null,
      leaseCheckoutId: null
    }
  });
}

export async function countUnlinkedExpenses(): Promise<number> {
  return prisma.expense.count({
    where: {
      propertyId: null,
      unitId: null,
      leaseId: null,
      ticketId: null,
      jobId: null,
      leaseCheckoutId: null
    }
  });
}

export type FinanceIncomeRow = {
  id: string;
  receiptNo: string;
  date: string;
  source: string;
  linkLabel: string;
  amount: string;
  method: string;
  status: string;
};

export async function listFinanceIncomeRows(
  view: FinanceTimeView,
  scope: FinanceScopeDiscriminant,
  take = 100
): Promise<FinanceIncomeRow[]> {
  const rows = await prisma.receipt.findMany({
    where: receiptPeriodWhere(view, scope),
    orderBy: { receivedAt: "desc" },
    take,
    include: {
      lease: { include: { unit: true, tenant: { select: { fullName: true } } } },
      ticket: { select: { ticketNo: true, title: true } },
      invoice: { select: { invoiceNo: true, jobId: true, leaseId: true } },
      leaseCheckout: {
        include: {
          lease: { include: { unit: { select: { unitNumber: true } }, tenant: { select: { fullName: true } } } }
        }
      }
    }
  });

  return rows.map((r) => {
    let linkLabel = "—";
    if (r.lease) {
      linkLabel = `Lease · Unit ${r.lease.unit.unitNumber} · ${r.lease.tenant.fullName}`;
    } else if (r.ticket) {
      linkLabel = `${r.ticket.ticketNo} · ${r.ticket.title}`;
    } else if (r.invoice) {
      linkLabel = r.invoice.invoiceNo;
    } else if (r.leaseCheckout) {
      linkLabel = `Checkout · Unit ${r.leaseCheckout.lease.unit.unitNumber} · ${r.leaseCheckout.lease.tenant.fullName}`;
    }

    const source = r.ticketId
      ? "Maintenance"
      : r.invoice?.jobId
        ? "Contracting"
        : r.leaseId || r.invoice?.leaseId
          ? "Lease"
          : r.leaseCheckoutId
            ? "Checkout"
            : r.invoiceId
              ? "Invoice"
              : "Unlinked";

    return {
      id: r.id,
      receiptNo: r.receiptNo,
      date: r.receivedAt.toISOString(),
      source,
      linkLabel,
      amount: r.amount.toString(),
      method: r.method,
      status: r.paymentStatus.trim().toLowerCase()
    };
  });
}

export type FinanceExpenseRow = {
  id: string;
  date: string;
  category: string;
  linkLabel: string;
  amount: string;
  supplier: string | null;
  status: string;
};

export async function listFinanceExpenseRows(
  view: FinanceTimeView,
  scope: FinanceScopeDiscriminant,
  take = 100
): Promise<FinanceExpenseRow[]> {
  const rows = await prisma.expense.findMany({
    where: expensePeriodWhere(view, scope),
    orderBy: { expenseDate: "desc" },
    take,
    include: {
      property: { select: { code: true, name: true } },
      lease: { include: { unit: true, tenant: { select: { fullName: true } } } },
      ticket: { select: { ticketNo: true, title: true } },
      job: { select: { jobNo: true, title: true } },
      leaseCheckout: {
        include: {
          lease: { include: { unit: { select: { unitNumber: true } }, tenant: { select: { fullName: true } } } }
        }
      }
    }
  });

  return rows.map((e) => {
    let linkLabel = "—";
    if (e.job) {
      linkLabel = `${e.job.jobNo} · ${e.job.title}`;
    } else if (e.ticket) {
      linkLabel = `${e.ticket.ticketNo} · ${e.ticket.title}`;
    } else if (e.lease) {
      linkLabel = `Lease · Unit ${e.lease.unit.unitNumber}`;
    } else if (e.property) {
      linkLabel = `${e.property.code} · ${e.property.name}`;
    } else if (e.leaseCheckout) {
      linkLabel = `Checkout · Unit ${e.leaseCheckout.lease.unit.unitNumber}`;
    }

    return {
      id: e.id,
      date: e.expenseDate.toISOString().slice(0, 10),
      category: e.category,
      linkLabel,
      amount: e.amount.toString(),
      supplier: e.vendorName,
      status: e.paymentStatus.trim().toLowerCase()
    };
  });
}

export type FinancePaymentRow = {
  id: string;
  paidAt: string;
  amount: string;
  method: string;
  referenceNo: string | null;
  invoiceNo: string;
  invoiceStatus: string;
  balanceHint: string;
};

export async function listFinanceInvoicePayments(
  view: FinanceTimeView,
  scope: FinanceScopeDiscriminant,
  take = 80
): Promise<FinancePaymentRow[]> {
  const { start, end } = getFinanceUtcRange(view);
  const invExtra = invoiceScopeWhere(scope);
  const rows = await prisma.payment.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      ...(invExtra ? { invoice: invExtra } : {})
    },
    orderBy: { paidAt: "desc" },
    take,
    include: {
      invoice: {
        include: {
          payments: { select: { amount: true } }
        }
      }
    }
  });

  return rows.map((p) => {
    const inv = p.invoice;
    const paid = inv.payments.reduce((s, x) => s + Number(x.amount), 0);
    const balance = Math.max(0, Number(inv.totalAmount) - paid);
    return {
      id: p.id,
      paidAt: p.paidAt.toISOString(),
      amount: p.amount.toString(),
      method: p.method,
      referenceNo: p.referenceNo,
      invoiceNo: inv.invoiceNo,
      invoiceStatus: inv.paymentStatus.trim().toLowerCase(),
      balanceHint: balance < 0.01 ? "Cleared" : `Balance ${formatFinanceMoney(balance)}`
    };
  });
}

export type FinanceOverviewTransaction = {
  id: string;
  kind: "receipt" | "expense" | "payment";
  at: string;
  title: string;
  subtitle: string;
  amount: string;
  href: string;
};

export async function getFinanceRecentTransactions(
  view: FinanceTimeView,
  scope: FinanceScopeDiscriminant,
  take = 18
): Promise<FinanceOverviewTransaction[]> {
  const { start, end } = getFinanceUtcRange(view);
  const invExtra = invoiceScopeWhere(scope);
  const [receipts, expenses, payments] = await Promise.all([
    prisma.receipt.findMany({
      where: receiptPeriodWhere(view, scope),
      orderBy: { receivedAt: "desc" },
      take: 80,
      select: { id: true, receiptNo: true, amount: true, receivedAt: true, paymentStatus: true }
    }),
    prisma.expense.findMany({
      where: expensePeriodWhere(view, scope),
      orderBy: { expenseDate: "desc" },
      take: 80,
      select: { id: true, category: true, amount: true, expenseDate: true, paymentStatus: true }
    }),
    prisma.payment.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        ...(invExtra ? { invoice: invExtra } : {})
      },
      orderBy: { paidAt: "desc" },
      take: 80,
      include: { invoice: { select: { invoiceNo: true } } }
    })
  ]);

  const out: FinanceOverviewTransaction[] = [];
  for (const r of receipts) {
    out.push({
      id: `rc-${r.id}`,
      kind: "receipt",
      at: r.receivedAt.toISOString(),
      title: `Receipt ${r.receiptNo}`,
      subtitle: r.paymentStatus,
      amount: r.amount.toString(),
      href: `/admin/finance?${financeScopeQuerySuffix(view, scope, "payments")}`
    });
  }
  for (const e of expenses) {
    out.push({
      id: `ex-${e.id}`,
      kind: "expense",
      at: new Date(e.expenseDate).toISOString(),
      title: `Expense · ${e.category}`,
      subtitle: e.paymentStatus,
      amount: e.amount.toString(),
      href: `/admin/finance?${financeScopeQuerySuffix(view, scope, "expenses")}`
    });
  }
  for (const p of payments) {
    out.push({
      id: `py-${p.id}`,
      kind: "payment",
      at: p.paidAt.toISOString(),
      title: `Payment · ${p.invoice.invoiceNo}`,
      subtitle: p.method,
      amount: p.amount.toString(),
      href: `/admin/finance?${financeScopeQuerySuffix(view, scope, "payments")}`
    });
  }
  out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return out.slice(0, take);
}
