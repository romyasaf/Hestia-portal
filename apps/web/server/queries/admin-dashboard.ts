import type { Prisma } from "@prisma/client";
import type { ActionPriorityBand } from "@/lib/action-required/priority";
import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { prisma } from "@/lib/prisma";
import { isTerminalMaintenanceStatus, MAINTENANCE_STATUSES } from "@/lib/maintenance/statuses";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import { getActionRequired, type ActionRequiredItem } from "@/server/action-required/engine";

/** Calendar "today" in UTC for stable comparison with `@db.Date` columns. */
function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** All non-terminal maintenance states (admin queue may surface any item still in flight). */
const ADMIN_TICKET_QUEUE_STATUSES = MAINTENANCE_STATUSES.filter((s) => !isTerminalMaintenanceStatus(s));

export type AdminDashboardKpis = {
  requestsPending: number;
  activeLeases: number;
  availableUnits: number;
  openMaintenanceTickets: number;
  newInquiries: number;
  expensesMonthTotal: number;
  receiptsMonthTotal: number;
  unpaidInvoices: number;
};

function utcMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const today = utcTodayDateOnly();
  const { start: monthStart, end: monthEnd } = utcMonthRange();

  const [
    requestsPending,
    activeLeases,
    availableUnits,
    openMaintenanceTickets,
    newInquiries,
    expenseAgg,
    receiptAgg,
    unpaidInvoices
  ] = await Promise.all([
    prisma.job.count({
      where: {
        sourceType: TENANT_REQUEST_SOURCE_TYPE,
        NOT: {
          OR: [
            { status: { equals: "completed", mode: "insensitive" } },
            { status: { equals: "cancelled", mode: "insensitive" } },
            { status: { equals: "rejected", mode: "insensitive" } }
          ]
        }
      }
    }),
    prisma.lease.count({
      where: {
        status: leaseStatusActiveWhere(),
        startDate: { lte: today },
        endDate: { gte: today }
      }
    }),
    prisma.unit.count({ where: { status: { equals: "available", mode: "insensitive" } } }),
    prisma.ticket.count({
      where: {
        NOT: { status: { in: ["Completed", "Cancelled", "Rejected"] } }
      }
    }),
    prisma.leadInquiry.count({ where: { status: { equals: "new", mode: "insensitive" } } }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true }
    }),
    prisma.receipt.aggregate({
      where: { receivedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true }
    }),
    prisma.invoice.count({
      where: {
        paymentStatus: { equals: "unpaid", mode: "insensitive" },
        NOT: { status: { equals: "draft", mode: "insensitive" } } }
    })
  ]);

  const expensesMonthTotal = Number(expenseAgg._sum.amount ?? 0);
  const receiptsMonthTotal = Number(receiptAgg._sum.amount ?? 0);

  return {
    requestsPending,
    activeLeases,
    availableUnits,
    openMaintenanceTickets,
    newInquiries,
    expensesMonthTotal,
    receiptsMonthTotal,
    unpaidInvoices
  };
}

export type AdminTicketListRow = {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  openedAt: string;
  openedByName: string;
  assignedToName: string | null;
  propertyCode: string;
  propertyName: string;
  unitNumber: string | null;
};

export type AdminJobListRow = {
  id: string;
  jobNo: string;
  requestKind: string | null;
  title: string;
  status: string;
  scope: string | null;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
  propertyLabel: string | null;
};

export type AdminActionItem = {
  id: string;
  kind: "ticket" | "request" | "checkin_issue" | "checkout";
  title: string;
  status: string;
  summary: string;
  href: string;
  sortAt: string;
  priority?: ActionPriorityBand;
  scheduleAt?: string | null;
};

function toAdminActionItem(i: ActionRequiredItem): AdminActionItem {
  const kind: AdminActionItem["kind"] =
    i.domain === "maintenance"
      ? "ticket"
      : i.domain === "tenant_request"
        ? "request"
        : i.domain === "checkin_issue"
          ? "checkin_issue"
          : "checkout";
  return {
    id: i.id,
    kind,
    title: i.title,
    status: i.status,
    summary: i.summary,
    href: i.href,
    sortAt: i.sortAt,
    priority: i.priority,
    scheduleAt: i.scheduleAt ?? null
  };
}

export async function getAdminActionQueue(limit = 16): Promise<AdminActionItem[]> {
  const bundle = await getActionRequired({ scope: "admin", userId: "system", limit });
  // Admin scope has no **tracking**; **actionRequired** is the ops task queue (**byPriority** would match that set only).
  return bundle.actionRequired.slice(0, limit).map(toAdminActionItem);
}

export type AdminDashboardTicketFilters = {
  status: string;
  q: string;
};

export type AdminDashboardJobFilters = {
  status: string;
  q: string;
};

function buildTicketWhere(filters: AdminDashboardTicketFilters): Prisma.TicketWhereInput {
  const clauses: Prisma.TicketWhereInput[] = [];

  if (filters.status === "action") {
    clauses.push({ status: { in: [...ADMIN_TICKET_QUEUE_STATUSES] } });
  } else if (filters.status === "open") {
    clauses.push({
      NOT: {
        status: { in: ["Completed", "Cancelled", "Rejected"] }
      }
    });
  } else if (filters.status && filters.status !== "all") {
    clauses.push({ status: filters.status });
  }

  const q = filters.q.trim();
  if (q) {
    clauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { ticketNo: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ]
    });
  }

  return clauses.length ? { AND: clauses } : {};
}

function buildJobWhere(filters: AdminDashboardJobFilters): Prisma.JobWhereInput {
  const clauses: Prisma.JobWhereInput[] = [{ sourceType: TENANT_REQUEST_SOURCE_TYPE }];

  if (filters.status === "pending") {
    clauses.push({
      NOT: {
        OR: [
          { status: { equals: "completed", mode: "insensitive" } },
          { status: { equals: "cancelled", mode: "insensitive" } },
          { status: { equals: "rejected", mode: "insensitive" } }
        ]
      }
    });
  } else if (filters.status && filters.status !== "all") {
    clauses.push({ status: { equals: filters.status, mode: "insensitive" } });
  }

  const q = filters.q.trim();
  if (q) {
    clauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { jobNo: { contains: q, mode: "insensitive" } },
        { scope: { contains: q, mode: "insensitive" } },
        { requester: { fullName: { contains: q, mode: "insensitive" } } },
        { requester: { email: { contains: q, mode: "insensitive" } } }
      ]
    });
  }

  return clauses.length ? { AND: clauses } : {};
}

function rowFromAdminTicket(t: {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  openedAt: Date;
  openedBy: { fullName: string };
  assignedTo: { fullName: string } | null;
  property: { code: string; name: string };
  unit: { unitNumber: string } | null;
}): AdminTicketListRow {
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    openedAt: t.openedAt.toISOString(),
    openedByName: t.openedBy.fullName,
    assignedToName: t.assignedTo?.fullName ?? null,
    propertyCode: t.property.code,
    propertyName: t.property.name,
    unitNumber: t.unit?.unitNumber ?? null
  };
}

export async function listAdminDashboardTickets(
  filters: AdminDashboardTicketFilters,
  take = 60
): Promise<AdminTicketListRow[]> {
  const where = buildTicketWhere(filters);
  const rows = await prisma.ticket.findMany({
    where,
    orderBy: { openedAt: "desc" },
    take,
    include: {
      openedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });
  return rows.map(rowFromAdminTicket);
}

export async function listAdminDashboardJobs(
  filters: AdminDashboardJobFilters,
  take = 60
): Promise<AdminJobListRow[]> {
  const where = buildJobWhere(filters);
  const rows = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      requester: { select: { fullName: true, email: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });

  return rows.map((j) => {
    let propertyLabel: string | null = null;
    if (j.property) {
      const u = j.unit?.unitNumber;
      propertyLabel = u ? `${j.property.name} · Unit ${u}` : j.property.name;
    } else if (j.unit) {
      propertyLabel = `Unit ${j.unit.unitNumber}`;
    }

    return {
      id: j.id,
      jobNo: j.jobNo,
      requestKind: j.requestKind,
      title: j.title,
      status: j.status.trim().toLowerCase(),
      scope: j.scope,
      createdAt: j.createdAt.toISOString(),
      requesterName: j.requester.fullName,
      requesterEmail: j.requester.email,
      propertyLabel
    };
  });
}

/** Status options for maintenance filter UI (value → label). */
export const ADMIN_TICKET_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "action", label: "Non-terminal (admin queue)" },
  { value: "open", label: "All open (not completed)" },
  ...MAINTENANCE_STATUSES.map((s) => ({ value: s, label: s }))
];

export const ADMIN_JOB_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Open (not terminal)" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft (legacy)" },
  { value: "pending_review", label: "Pending review (legacy)" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

const TICKET_STATUS_VALUES = new Set(ADMIN_TICKET_STATUS_FILTER_OPTIONS.map((o) => o.value));
const JOB_STATUS_VALUES = new Set(ADMIN_JOB_STATUS_FILTER_OPTIONS.map((o) => o.value));

export type AdminOperationsSnapshot = {
  maintenanceInProgress: number;
  scheduledThisWeek: {
    id: string;
    ticketNo: string;
    title: string;
    appointmentAt: string;
    propertyName: string;
    unitNumber: string | null;
  }[];
  todaysAppointments: {
    id: string;
    ticketNo: string;
    title: string;
    appointmentAt: string;
  }[];
  occupancyPercent: number | null;
  recentLeases: {
    id: string;
    createdAt: string;
    tenantName: string;
    label: string;
  }[];
};

export type AdminFinanceRow = {
  id: string;
  primary: string;
  secondary: string;
  amount: number;
  dateLabel: string;
  href: string;
};

export type AdminFinanceSnapshot = {
  receipts: AdminFinanceRow[];
  expenses: AdminFinanceRow[];
};

export type AdminActivityItem = {
  at: string;
  title: string;
  subtitle: string;
  href: string;
  variant: "lease" | "ticket" | "inquiry" | "request" | "expense" | "receipt";
};

export function formatDashboardMoney(n: number): string {
  if (!Number.isFinite(n)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "QAR", maximumFractionDigits: 0 }).format(
    n
  );
}

function money(n: number): string {
  return formatDashboardMoney(n);
}

export async function getAdminOperationsSnapshot(): Promise<AdminOperationsSnapshot> {
  const today = utcTodayDateOnly();
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const [
    maintenanceInProgress,
    scheduledRows,
    todayRows,
    activeLeases,
    totalUnits,
    recentLeaseRows
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: "In Progress" } }),
    prisma.ticket.findMany({
      where: {
        status: "Scheduled",
        appointmentAt: { not: null, gte: now, lte: weekEnd }
      },
      orderBy: { appointmentAt: "asc" },
      take: 8,
      select: {
        id: true,
        ticketNo: true,
        title: true,
        appointmentAt: true,
        property: { select: { name: true } },
        unit: { select: { unitNumber: true } }
      }
    }),
    prisma.ticket.findMany({
      where: {
        status: "Scheduled",
        appointmentAt: { gte: dayStart, lte: dayEnd }
      },
      orderBy: { appointmentAt: "asc" },
      take: 8,
      select: {
        id: true,
        ticketNo: true,
        title: true,
        appointmentAt: true
      }
    }),
    prisma.lease.count({
      where: {
        status: leaseStatusActiveWhere(),
        startDate: { lte: today },
        endDate: { gte: today }
      }
    }),
    prisma.unit.count(),
    prisma.lease.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        tenant: { select: { fullName: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } }
      }
    })
  ]);

  const occupancyPercent =
    totalUnits > 0 ? Math.round((activeLeases / totalUnits) * 1000) / 10 : null;

  return {
    maintenanceInProgress,
    scheduledThisWeek: scheduledRows.map((t) => ({
      id: t.id,
      ticketNo: t.ticketNo,
      title: t.title,
      appointmentAt: t.appointmentAt!.toISOString(),
      propertyName: t.property.name,
      unitNumber: t.unit?.unitNumber ?? null
    })),
    todaysAppointments: todayRows
      .filter((t) => t.appointmentAt)
      .map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        title: t.title,
        appointmentAt: t.appointmentAt!.toISOString()
      })),
    occupancyPercent,
    recentLeases: recentLeaseRows.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      tenantName: l.tenant.fullName,
      label: `${l.unit.property.name} · Unit ${l.unit.unitNumber}`
    }))
  };
}

export async function getAdminFinanceSnapshot(): Promise<AdminFinanceSnapshot> {
  const [receiptRows, expenseRows] = await Promise.all([
    prisma.receipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: 5,
      select: {
        id: true,
        receiptNo: true,
        amount: true,
        receivedAt: true,
        category: true
      }
    }),
    prisma.expense.findMany({
      orderBy: { expenseDate: "desc" },
      take: 5,
      select: {
        id: true,
        category: true,
        amount: true,
        expenseDate: true,
        vendorName: true
      }
    })
  ]);

  return {
    receipts: receiptRows.map((r) => ({
      id: r.id,
      primary: r.receiptNo,
      secondary: r.category?.trim() || "Receipt",
      amount: Number(r.amount),
      dateLabel: new Date(r.receivedAt).toLocaleDateString(),
      href: "/admin/receipts"
    })),
    expenses: expenseRows.map((e) => ({
      id: e.id,
      primary: e.category,
      secondary: e.vendorName?.trim() || "Expense",
      amount: Number(e.amount),
      dateLabel: new Date(e.expenseDate).toLocaleDateString(),
      href: "/admin/expenses"
    }))
  };
}


export async function getAdminRecentActivity(take = 12): Promise<AdminActivityItem[]> {
  const per = Math.max(3, Math.ceil(take / 5));
  const [leases, tickets, inquiries, jobs, expenses, receipts] = await Promise.all([
    prisma.lease.findMany({
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        tenant: { select: { fullName: true } },
        unit: { select: { unitNumber: true, property: { select: { code: true } } } }
      }
    }),
    prisma.ticket.findMany({
      where: {
        status: { in: ["Completed", "Cancelled", "Rejected"] },
        closedAt: { not: null }
      },
      orderBy: { closedAt: "desc" },
      take: per,
      select: { id: true, ticketNo: true, title: true, status: true, closedAt: true }
    }),
    prisma.leadInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: per,
      select: { id: true, fullName: true, inquiryType: true, createdAt: true }
    }),
    prisma.job.findMany({
      where: { sourceType: TENANT_REQUEST_SOURCE_TYPE },
      orderBy: { createdAt: "desc" },
      take: per,
      select: { id: true, jobNo: true, title: true, status: true, createdAt: true }
    }),
    prisma.expense.findMany({
      orderBy: { expenseDate: "desc" },
      take: per,
      select: { id: true, category: true, amount: true, expenseDate: true }
    }),
    prisma.receipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: per,
      select: { id: true, receiptNo: true, amount: true, receivedAt: true }
    })
  ]);

  const items: AdminActivityItem[] = [];

  for (const l of leases) {
    items.push({
      at: l.createdAt.toISOString(),
      title: `Lease recorded · ${l.tenant.fullName}`,
      subtitle: `${l.unit.property.code} · ${l.unit.unitNumber}`,
      href: `/admin/leases/${l.id}`,
      variant: "lease"
    });
  }
  for (const t of tickets) {
    const at = t.closedAt?.toISOString();
    if (!at) {
      continue;
    }
    items.push({
      at,
      title: `${t.ticketNo} · ${t.title}`,
      subtitle: `Maintenance · ${t.status}`,
      href: `/admin/maintenance/${t.id}`,
      variant: "ticket"
    });
  }
  for (const q of inquiries) {
    items.push({
      at: q.createdAt.toISOString(),
      title: `Inquiry · ${q.fullName}`,
      subtitle: q.inquiryType,
      href: "/admin/inquiries",
      variant: "inquiry"
    });
  }
  for (const j of jobs) {
    items.push({
      at: j.createdAt.toISOString(),
      title: `${j.jobNo} · ${j.title}`,
      subtitle: `Request · ${j.status}`,
      href: `/admin/requests/${j.id}`,
      variant: "request"
    });
  }
  for (const e of expenses) {
    items.push({
      at: new Date(e.expenseDate).toISOString(),
      title: `Expense · ${e.category}`,
      subtitle: money(Number(e.amount)),
      href: "/admin/expenses",
      variant: "expense"
    });
  }
  for (const r of receipts) {
    items.push({
      at: r.receivedAt.toISOString(),
      title: `Receipt · ${r.receiptNo}`,
      subtitle: money(Number(r.amount)),
      href: "/admin/receipts",
      variant: "receipt"
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, take);
}

export type AdminInquiryPreview = {
  id: string;
  fullName: string;
  inquiryType: string;
  createdAt: string;
};

export async function getAdminNewInquiriesPreview(take = 5): Promise<AdminInquiryPreview[]> {
  const rows = await prisma.leadInquiry.findMany({
    where: { status: { equals: "new", mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, fullName: true, inquiryType: true, createdAt: true }
  });
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    inquiryType: r.inquiryType,
    createdAt: r.createdAt.toISOString()
  }));
}

export function parseAdminDashboardSearchParams(sp: Record<string, string | string[] | undefined>): {
  ticketStatus: string;
  ticketQ: string;
  jobStatus: string;
  jobQ: string;
} {
  const pick = (key: string): string => {
    const v = sp[key];
    return typeof v === "string" ? v : "";
  };

  const ticketStatusRaw = pick("ticketStatus");
  const jobStatusRaw = pick("jobStatus");

  return {
    ticketStatus: TICKET_STATUS_VALUES.has(ticketStatusRaw) ? ticketStatusRaw : "all",
    ticketQ: pick("ticketQ").slice(0, 200),
    jobStatus: JOB_STATUS_VALUES.has(jobStatusRaw) ? jobStatusRaw : "all",
    jobQ: pick("jobQ").slice(0, 200)
  };
}
