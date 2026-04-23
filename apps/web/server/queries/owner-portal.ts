import type { Prisma } from "@prisma/client";
import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { isOperatorContract } from "@/lib/owner/contract";
import { ownerOperatorMoneyClauses } from "@/lib/owner/operator-money-scope";
import { ownerPropertyMoneyOrClauses } from "@/lib/owner/money-scope";
import { prisma } from "@/lib/prisma";

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type OwnerPropertyRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  ownerFinancialAccess: boolean;
  /** Building-level contract when you are building owner; unit stakes are always managed. */
  ownerContractType: "operator" | "managed" | null;
};

export type OwnerOccupancyRow = {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyCode: string;
  status: string;
  leaseId: string | null;
  tenantName: string | null;
  leaseStatus: string | null;
};

export type OwnerLeaseRow = {
  leaseId: string;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  status: string;
};

export type OwnerTicketRow = {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  unitNumber: string | null;
  openedAt: string;
};

export type OwnerFinancialSummary = {
  receiptsSum: string;
  expensesPaidSum: string;
  expensesPendingSum: string;
  sinceLabel: string;
};

export type OwnerPortalNavFlags = {
  /** Managed portfolio: direct unit ownership and/or managed building-level ownership. */
  showUnitsLeases: boolean;
};

export type OwnerDashboardMode = "operator_only" | "managed_only" | "mixed";

type OwnerBuckets = {
  operatorPropertyIds: string[];
  managedBuildingPropertyIds: string[];
  directUnitPropertyIds: string[];
};

async function loadOwnerBuckets(userId: string): Promise<OwnerBuckets> {
  const [buildingOwned, unitOwned] = await Promise.all([
    prisma.property.findMany({
      where: { ownerUserId: userId },
      select: { id: true, ownerContractType: true }
    }),
    prisma.unit.findMany({
      where: { ownerUserId: userId },
      select: { propertyId: true }
    })
  ]);

  const operatorPropertyIds: string[] = [];
  const managedBuildingPropertyIds: string[] = [];
  for (const p of buildingOwned) {
    if (isOperatorContract(p.ownerContractType)) {
      operatorPropertyIds.push(p.id);
    } else {
      managedBuildingPropertyIds.push(p.id);
    }
  }
  const directUnitPropertyIds = [...new Set(unitOwned.map((u) => u.propertyId))];
  return { operatorPropertyIds, managedBuildingPropertyIds, directUnitPropertyIds };
}

function managedPortfolioPropertyIds(b: OwnerBuckets): string[] {
  return [...new Set([...b.managedBuildingPropertyIds, ...b.directUnitPropertyIds])];
}

export async function getOwnerPortalNavFlags(userId: string): Promise<OwnerPortalNavFlags> {
  const b = await loadOwnerBuckets(userId);
  const hasManaged = managedPortfolioPropertyIds(b).length > 0;
  return { showUnitsLeases: hasManaged };
}

export async function getOwnerDashboardMode(userId: string): Promise<OwnerDashboardMode> {
  const b = await loadOwnerBuckets(userId);
  const hasOperator = b.operatorPropertyIds.length > 0;
  const hasManaged = managedPortfolioPropertyIds(b).length > 0;
  if (hasOperator && !hasManaged) {
    return "operator_only";
  }
  if (!hasOperator && hasManaged) {
    return "managed_only";
  }
  if (hasOperator && hasManaged) {
    return "mixed";
  }
  return "managed_only";
}

/** Buildings the user can see: any building-level stake plus buildings containing a directly owned unit. */
export async function listOwnedPropertiesForUser(userId: string): Promise<OwnerPropertyRow[]> {
  const [buildingOwned, viaUnits] = await Promise.all([
    prisma.property.findMany({
      where: { ownerUserId: userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        ownerFinancialAccess: true,
        ownerContractType: true
      }
    }),
    prisma.unit.findMany({
      where: { ownerUserId: userId },
      select: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            ownerFinancialAccess: true,
            ownerContractType: true
          }
        }
      }
    })
  ]);

  const byId = new Map<string, OwnerPropertyRow>();
  for (const r of buildingOwned) {
    byId.set(r.id, {
      id: r.id,
      code: r.code,
      name: r.name,
      city: r.city,
      ownerFinancialAccess: r.ownerFinancialAccess,
      ownerContractType: isOperatorContract(r.ownerContractType) ? "operator" : "managed"
    });
  }
  for (const u of viaUnits) {
    const p = u.property;
    if (!byId.has(p.id)) {
      byId.set(p.id, {
        id: p.id,
        code: p.code,
        name: p.name,
        city: p.city,
        ownerFinancialAccess: p.ownerFinancialAccess,
        ownerContractType: null
      });
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Managed portfolio only: excludes units under operator (fixed-lease) buildings unless user owns the unit. */
export async function listOwnerOccupancy(userId: string): Promise<OwnerOccupancyRow[]> {
  const b = await loadOwnerBuckets(userId);
  const managedProps = managedPortfolioPropertyIds(b);
  if (managedProps.length === 0) {
    return [];
  }

  const units = await prisma.unit.findMany({
    where: {
      OR: [{ ownerUserId: userId }, { propertyId: { in: managedProps } }]
    },
    orderBy: [{ propertyId: "asc" }, { unitNumber: "asc" }],
    include: {
      property: { select: { id: true, code: true } },
      leases: {
        where: {
          status: leaseStatusActiveWhere(),
          startDate: { lte: utcTodayDateOnly() },
          endDate: { gte: utcTodayDateOnly() }
        },
        orderBy: { startDate: "desc" },
        take: 1,
        include: { tenant: { select: { fullName: true } } }
      }
    }
  });

  const out: OwnerOccupancyRow[] = [];
  for (const u of units) {
    if (!managedProps.includes(u.propertyId) && u.ownerUserId !== userId) {
      continue;
    }
    const active = u.leases[0];
    out.push({
      unitId: u.id,
      unitNumber: u.unitNumber,
      propertyId: u.propertyId,
      propertyCode: u.property.code,
      status: u.status,
      leaseId: active?.id ?? null,
      tenantName: active?.tenant.fullName ?? null,
      leaseStatus: active?.status ?? null
    });
  }
  return out;
}

export async function listOwnerLeases(userId: string): Promise<OwnerLeaseRow[]> {
  const b = await loadOwnerBuckets(userId);
  const managedProps = managedPortfolioPropertyIds(b);
  if (managedProps.length === 0) {
    return [];
  }

  const leases = await prisma.lease.findMany({
    where: {
      unit: {
        OR: [{ ownerUserId: userId }, { propertyId: { in: managedProps } }]
      }
    },
    orderBy: { endDate: "desc" },
    take: 80,
    include: {
      tenant: { select: { fullName: true, email: true } },
      unit: { select: { unitNumber: true, propertyId: true, ownerUserId: true, property: { select: { name: true } } } }
    }
  });

  const rows: OwnerLeaseRow[] = [];
  for (const l of leases) {
    const u = l.unit;
    if (u.ownerUserId !== userId && !managedProps.includes(u.propertyId)) {
      continue;
    }
    rows.push({
      leaseId: l.id,
      unitNumber: u.unitNumber,
      propertyName: u.property.name,
      tenantName: l.tenant.fullName,
      tenantEmail: l.tenant.email,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      rentAmount: l.rentAmount.toString(),
      status: l.status
    });
  }
  return rows;
}

export async function listOwnerTickets(userId: string): Promise<OwnerTicketRow[]> {
  const b = await loadOwnerBuckets(userId);
  const managedProps = managedPortfolioPropertyIds(b);
  const op = b.operatorPropertyIds;

  const orClause = [];
  if (managedProps.length > 0) {
    orClause.push({ propertyId: { in: managedProps } });
  }
  if (op.length > 0) {
    orClause.push({ AND: [{ propertyId: { in: op } }, { unitId: null }] });
  }
  if (orClause.length === 0) {
    return [];
  }

  const rows = await prisma.ticket.findMany({
    where: { OR: orClause },
    orderBy: { openedAt: "desc" },
    take: 60,
    include: { unit: { select: { unitNumber: true } } }
  });

  return rows.map((t) => ({
    id: t.id,
    ticketNo: t.ticketNo,
    title: t.title,
    status: t.status,
    priority: t.priority,
    unitNumber: t.unit?.unitNumber ?? null,
    openedAt: t.openedAt.toISOString()
  }));
}

export async function getOwnerFinancialSummary(userId: string, sinceDays = 90): Promise<OwnerFinancialSummary | null> {
  const financialProps = await prisma.property.findMany({
    where: { ownerUserId: userId, ownerFinancialAccess: true },
    select: { id: true, ownerContractType: true }
  });
  const unitFinanceProps = await prisma.unit.findMany({
    where: { ownerUserId: userId, property: { ownerFinancialAccess: true } },
    select: { propertyId: true }
  });

  const managedFinanceIds = new Set<string>();
  const operatorFinanceIds: string[] = [];

  for (const p of financialProps) {
    if (isOperatorContract(p.ownerContractType)) {
      operatorFinanceIds.push(p.id);
    } else {
      managedFinanceIds.add(p.id);
    }
  }
  for (const u of unitFinanceProps) {
    managedFinanceIds.add(u.propertyId);
  }

  if (managedFinanceIds.size === 0 && operatorFinanceIds.length === 0) {
    return null;
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  const money = (n: { toString(): string } | number | null | undefined) =>
    n == null ? "0" : typeof n === "number" ? String(n) : n.toString();

  const managedClause =
    managedFinanceIds.size > 0 ? ownerPropertyMoneyOrClauses([...managedFinanceIds]) : null;
  const operatorClause =
    operatorFinanceIds.length > 0 ? ownerOperatorMoneyClauses(operatorFinanceIds) : null;

  const baseReceiptWhere = {
    receivedAt: { gte: since },
    NOT: { paymentStatus: { equals: "voided", mode: "insensitive" as const } }
  };
  const baseExpensePaid = {
    expenseDate: { gte: since },
    paymentStatus: { equals: "paid", mode: "insensitive" as const }
  };
  const buildPendingExpenseWhere = (scope: Prisma.ExpenseWhereInput): Prisma.ExpenseWhereInput => ({
    expenseDate: { gte: since },
    AND: [
      {
        OR: [
          { paymentStatus: { equals: "pending", mode: "insensitive" as const } },
          { paymentStatus: { equals: "approved", mode: "insensitive" as const } }
        ]
      },
      scope
    ]
  });

  const parts: { receipts: unknown; expPaid: unknown; expPending: unknown }[] = [];

  if (managedClause) {
    const [r1, e1, e2] = await Promise.all([
      prisma.receipt.aggregate({
        where: { ...baseReceiptWhere, ...managedClause.receipt },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { ...baseExpensePaid, ...managedClause.expense },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: buildPendingExpenseWhere(managedClause.expense),
        _sum: { amount: true }
      })
    ]);
    parts.push({ receipts: r1._sum.amount, expPaid: e1._sum.amount, expPending: e2._sum.amount });
  }
  if (operatorClause) {
    const [r1, e1, e2] = await Promise.all([
      prisma.receipt.aggregate({
        where: { ...baseReceiptWhere, ...operatorClause.receipt },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { ...baseExpensePaid, ...operatorClause.expense },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: buildPendingExpenseWhere(operatorClause.expense),
        _sum: { amount: true }
      })
    ]);
    parts.push({ receipts: r1._sum.amount, expPaid: e1._sum.amount, expPending: e2._sum.amount });
  }

  const dec = (v: unknown) => (v == null ? 0 : Number.parseFloat(String(v)));
  let receiptsSum = 0;
  let expPaidSum = 0;
  let expPendingSum = 0;
  for (const p of parts) {
    receiptsSum += dec(p.receipts);
    expPaidSum += dec(p.expPaid);
    expPendingSum += dec(p.expPending);
  }

  return {
    receiptsSum: money(receiptsSum),
    expensesPaidSum: money(expPaidSum),
    expensesPendingSum: money(expPendingSum),
    sinceLabel: since.toISOString().slice(0, 10)
  };
}
