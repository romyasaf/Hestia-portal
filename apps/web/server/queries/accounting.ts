import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";

function money(n: { toString(): string }): string {
  return n.toString();
}

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function computeInvoicePaymentStatus(
  invoiceId: string
): Promise<"unpaid" | "partial" | "paid" | "overdue"> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  if (!inv) {
    return "unpaid";
  }
  const total = Number(inv.totalAmount);
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;
  if (balance <= 0.01) {
    return "paid";
  }
  const due = new Date(
    Date.UTC(inv.dueDate.getUTCFullYear(), inv.dueDate.getUTCMonth(), inv.dueDate.getUTCDate())
  );
  const today = utcTodayDateOnly();
  if (due < today) {
    return "overdue";
  }
  if (paid > 0.01) {
    return "partial";
  }
  return "unpaid";
}

export async function syncInvoicePaymentStatus(invoiceId: string): Promise<void> {
  const next = await computeInvoicePaymentStatus(invoiceId);
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus: next }
  });
}

export type ReceiptListRow = {
  id: string;
  receiptNo: string;
  amount: string;
  receivedAt: string;
  method: string;
  referenceNo: string | null;
  paymentStatus: string;
  leaseLabel: string | null;
  ticketLabel: string | null;
  invoiceNo: string | null;
  checkoutLabel: string | null;
  category: string | null;
  subcategory: string | null;
};

export async function listReceiptsForAdmin(take = 80): Promise<ReceiptListRow[]> {
  const rows = await prisma.receipt.findMany({
    orderBy: { receivedAt: "desc" },
    take,
    include: {
      lease: {
        include: { unit: true, tenant: { select: { fullName: true } } }
      },
      ticket: { select: { ticketNo: true, title: true } },
      invoice: { select: { invoiceNo: true } },
      leaseCheckout: {
        include: {
          lease: {
            include: { unit: { select: { unitNumber: true } }, tenant: { select: { fullName: true } } }
          }
        }
      }
    }
  });
  return rows.map((r) => ({
    id: r.id,
    receiptNo: r.receiptNo,
    amount: money(r.amount),
    receivedAt: r.receivedAt.toISOString(),
    method: r.method,
    referenceNo: r.referenceNo,
    paymentStatus: r.paymentStatus.trim().toLowerCase(),
    leaseLabel: r.lease
      ? `${r.lease.unit.unitNumber} · ${r.lease.tenant.fullName}`
      : null,
    ticketLabel: r.ticket ? `${r.ticket.ticketNo} · ${r.ticket.title}` : null,
    invoiceNo: r.invoice?.invoiceNo ?? null,
    checkoutLabel: r.leaseCheckout
      ? `Checkout · Unit ${r.leaseCheckout.lease.unit.unitNumber} · ${r.leaseCheckout.lease.tenant.fullName}`
      : null,
    category: r.category ?? null,
    subcategory: r.subcategory ?? null
  }));
}

export type ExpenseListRow = {
  id: string;
  category: string;
  subcategory: string | null;
  amount: string;
  expenseDate: string;
  vendorName: string | null;
  paymentStatus: string;
  propertyLabel: string | null;
  leaseLabel: string | null;
  ticketNo: string | null;
  checkoutLabel: string | null;
};

export async function listExpensesForAdmin(take = 80): Promise<ExpenseListRow[]> {
  const rows = await prisma.expense.findMany({
    orderBy: { expenseDate: "desc" },
    take,
    include: {
      property: { select: { code: true, name: true } },
      lease: { include: { unit: true, tenant: { select: { fullName: true } } } },
      ticket: { select: { ticketNo: true } },
      leaseCheckout: {
        include: {
          lease: {
            include: { unit: { select: { unitNumber: true } }, tenant: { select: { fullName: true } } }
          }
        }
      }
    }
  });
  return rows.map((e) => ({
    id: e.id,
    category: e.category,
    subcategory: e.subcategory ?? null,
    amount: money(e.amount),
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    vendorName: e.vendorName,
    paymentStatus: e.paymentStatus.trim().toLowerCase(),
    propertyLabel: e.property ? `${e.property.code} · ${e.property.name}` : null,
    leaseLabel: e.lease ? `Lease · Unit ${e.lease.unit.unitNumber}` : null,
    ticketNo: e.ticket?.ticketNo ?? null,
    checkoutLabel: e.leaseCheckout
      ? `Checkout · Unit ${e.leaseCheckout.lease.unit.unitNumber} · ${e.leaseCheckout.lease.tenant.fullName}`
      : null
  }));
}

export type LeaseOption = { id: string; label: string };
export type TicketOption = { id: string; label: string };
export type InvoiceOption = { id: string; label: string };
export type PropertyOption = { id: string; label: string };
export type CheckoutOption = { id: string; label: string };

export async function listLeaseOptionsForAccounting(): Promise<LeaseOption[]> {
  const rows = await prisma.lease.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      unit: { select: { unitNumber: true } },
      tenant: { select: { fullName: true, email: true } }
    }
  });
  return rows.map((l) => ({
    id: l.id,
    label: `Unit ${l.unit.unitNumber} · ${l.tenant.fullName} (${l.tenant.email})`
  }));
}

export async function listTicketOptionsForAccounting(): Promise<TicketOption[]> {
  const rows = await prisma.ticket.findMany({
    orderBy: { openedAt: "desc" },
    take: 150,
    select: { id: true, ticketNo: true, title: true }
  });
  return rows.map((t) => ({
    id: t.id,
    label: `${t.ticketNo} · ${t.title}`
  }));
}

export async function listInvoiceOptionsForAccounting(): Promise<InvoiceOption[]> {
  const rows = await prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    take: 150,
    select: { id: true, invoiceNo: true, totalAmount: true, paymentStatus: true }
  });
  return rows.map((i) => ({
    id: i.id,
    label: `${i.invoiceNo} · ${money(i.totalAmount)} · ${i.paymentStatus}`
  }));
}

export async function listPropertyOptionsForAccounting(): Promise<PropertyOption[]> {
  const rows = await prisma.property.findMany({
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, code: true, name: true }
  });
  return rows.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }));
}

export type JobOption = { id: string; label: string };

export async function listJobOptionsForAccounting(): Promise<JobOption[]> {
  const rows = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    select: { id: true, jobNo: true, title: true }
  });
  return rows.map((j) => ({
    id: j.id,
    label: `${j.jobNo} · ${j.title}`
  }));
}

export async function listCheckoutOptionsForAccounting(): Promise<CheckoutOption[]> {
  const rows = await prisma.leaseCheckOut.findMany({
    where: { NOT: { status: { equals: "cancelled", mode: "insensitive" } } },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      lease: {
        include: {
          unit: { select: { unitNumber: true } },
          tenant: { select: { fullName: true } }
        }
      }
    }
  });
  return rows.map((c) => ({
    id: c.id,
    label: `Checkout · Unit ${c.lease.unit.unitNumber} · ${c.lease.tenant.fullName} (${c.status})`
  }));
}

export type AccountingReport = {
  receiptsRecordedSum: string;
  expensesPaidSum: string;
  expensesPendingSum: string;
  unpaidInvoiceCount: number;
  unpaidInvoiceAmount: string;
  expenseByCategory: { category: string; total: string }[];
  expenseByCategorySubcategory: { category: string; subcategory: string | null; total: string }[];
  sinceLabel: string;
};

export async function getAccountingReport(sinceDays = 90): Promise<AccountingReport> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  const [receiptAgg, expensePaidAgg, expensePendingAgg, unpaidInvoices, expenseByCat, expenseByCatSub] =
    await Promise.all([
    prisma.receipt.aggregate({
      where: {
        receivedAt: { gte: since },
        NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
      },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: since },
        paymentStatus: { equals: "paid", mode: "insensitive" }
      },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: since },
        OR: [
          { paymentStatus: { equals: "pending", mode: "insensitive" } },
          { paymentStatus: { equals: "approved", mode: "insensitive" } }
        ]
      },
      _sum: { amount: true }
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { paymentStatus: { equals: "unpaid", mode: "insensitive" } },
          { paymentStatus: { equals: "partial", mode: "insensitive" } },
          { paymentStatus: { equals: "overdue", mode: "insensitive" } },
          { paymentStatus: { equals: "failed", mode: "insensitive" } }
        ]
      },
      select: { id: true, totalAmount: true, paymentStatus: true, payments: { select: { amount: true } } }
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        expenseDate: { gte: since },
        NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
      },
      _sum: { amount: true }
    }),
    prisma.expense.groupBy({
      by: ["category", "subcategory"],
      where: {
        expenseDate: { gte: since },
        NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
      },
      _sum: { amount: true }
    })
  ]);

  let unpaidTotal = 0;
  for (const inv of unpaidInvoices) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    unpaidTotal += Math.max(0, Number(inv.totalAmount) - paid);
  }

  return {
    receiptsRecordedSum: money(receiptAgg._sum.amount ?? 0),
    expensesPaidSum: money(expensePaidAgg._sum.amount ?? 0),
    expensesPendingSum: money(expensePendingAgg._sum.amount ?? 0),
    unpaidInvoiceCount: unpaidInvoices.length,
    unpaidInvoiceAmount: money(unpaidTotal),
    expenseByCategory: expenseByCat
      .map((r) => ({
        category: r.category,
        total: money(r._sum.amount ?? 0)
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    expenseByCategorySubcategory: expenseByCatSub
      .map((r) => ({
        category: r.category,
        subcategory: r.subcategory ?? null,
        total: money(r._sum.amount ?? 0)
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    sinceLabel: since.toISOString().slice(0, 10)
  };
}

export type UnpaidInvoiceRow = {
  id: string;
  invoiceNo: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  paymentStatus: string;
  dueDate: string;
};

export async function listUnpaidInvoicesForAdmin(
  take = 25,
  issueRange?: { start: Date; end: Date },
  invoiceScope?: Prisma.InvoiceWhereInput
): Promise<UnpaidInvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    where: {
      AND: [
        {
          OR: [
            { paymentStatus: { equals: "unpaid", mode: "insensitive" } },
            { paymentStatus: { equals: "partial", mode: "insensitive" } },
            { paymentStatus: { equals: "overdue", mode: "insensitive" } },
            { paymentStatus: { equals: "failed", mode: "insensitive" } }
          ]
        },
        ...(issueRange
          ? [{ issueDate: { gte: issueRange.start, lte: issueRange.end } } satisfies Prisma.InvoiceWhereInput]
          : []),
        ...(invoiceScope ? [invoiceScope] : [])
      ]
    },
    orderBy: { dueDate: "asc" },
    take,
    include: { payments: true }
  });
  return rows.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(inv.totalAmount) - paid);
    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      totalAmount: money(inv.totalAmount),
      paidAmount: money(paid),
      balance: money(balance),
      paymentStatus: inv.paymentStatus.trim().toLowerCase(),
      dueDate: inv.dueDate.toISOString().slice(0, 10)
    };
  });
}

/** Resolves the caller’s active lease, then returns invoices/receipts for that lease only. */
export async function listInvoicesAndReceiptsForTenantLease(tenantUserId: string) {
  const lease = await getOperationalLeaseForTenant(tenantUserId);
  if (!lease) {
    return { invoices: [], receipts: [] };
  }
  const leaseId = lease.leaseId;
  const [invoices, receipts] = await Promise.all([
    prisma.invoice.findMany({
      where: { leaseId },
      orderBy: { issueDate: "desc" },
      take: 40,
      include: { payments: true }
    }),
    prisma.receipt.findMany({
      where: { leaseId },
      orderBy: { receivedAt: "desc" },
      take: 40
    })
  ]);

  return {
    invoices: invoices.map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        issueDate: inv.issueDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        totalAmount: money(inv.totalAmount),
        paidAmount: money(paid),
        paymentStatus: inv.paymentStatus.trim().toLowerCase()
      };
    }),
    receipts: receipts.map((r) => ({
      id: r.id,
      receiptNo: r.receiptNo,
      amount: money(r.amount),
      receivedAt: r.receivedAt.toISOString(),
      method: r.method,
      paymentStatus: r.paymentStatus.trim().toLowerCase()
    }))
  };
}
