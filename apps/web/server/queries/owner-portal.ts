import type { Prisma } from "@prisma/client";
import { formatBuildingAddressLine } from "@/lib/portfolio/building-address";
import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { isOperatorContract } from "@/lib/owner/contract";
import { OWNER_LIABILITY_CATEGORY_FILTERS } from "@/lib/owner/finance-categories";
import { ownerPropertyMoneyOrClauses, ownerUnitMoneyOrClauses } from "@/lib/owner/money-scope";
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
  formattedAddress: string;
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
  /** Properties where this user is the building-level owner (`properties.owner_user_id`). */
  buildingOwnerPropertyIds: string[];
  /** Units where this user is the direct owner (`units.owner_user_id`). */
  ownedUnitIds: string[];
};

async function loadOwnerBuckets(userId: string): Promise<OwnerBuckets> {
  const [buildingOwned, unitOwned] = await Promise.all([
    prisma.property.findMany({
      where: { ownerUserId: userId },
      select: { id: true, ownerContractType: true }
    }),
    prisma.unit.findMany({
      where: { ownerUserId: userId },
      select: { id: true, propertyId: true }
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
  const buildingOwnerPropertyIds = buildingOwned.map((p) => p.id);
  const ownedUnitIds = unitOwned.map((u) => u.id);
  return {
    operatorPropertyIds,
    managedBuildingPropertyIds,
    directUnitPropertyIds,
    buildingOwnerPropertyIds,
    ownedUnitIds
  };
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
        addressZone: true,
        addressStreet: true,
        addressBuildingNumber: true,
        addressAreaName: true,
        addressNotes: true,
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
            addressZone: true,
            addressStreet: true,
            addressBuildingNumber: true,
            addressAreaName: true,
            addressNotes: true,
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
      formattedAddress: formatBuildingAddressLine(r),
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
        formattedAddress: formatBuildingAddressLine(p),
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
        select: {
          id: true,
          status: true,
          tenant: { select: { fullName: true } }
        }
      }
    }
  });

  const buildingOwnerSet = new Set(b.buildingOwnerPropertyIds);

  const out: OwnerOccupancyRow[] = [];
  for (const u of units) {
    const userOwnsBuilding = buildingOwnerSet.has(u.propertyId);
    const userOwnsUnit = u.ownerUserId === userId;
    if (!userOwnsUnit && !userOwnsBuilding) {
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
    select: {
      id: true,
      startDate: true,
      endDate: true,
      rentAmount: true,
      status: true,
      tenant: { select: { fullName: true, email: true } },
      unit: { select: { unitNumber: true, propertyId: true, ownerUserId: true, property: { select: { name: true } } } }
    }
  });

  const buildingOwnerSet = new Set(b.buildingOwnerPropertyIds);

  const rows: OwnerLeaseRow[] = [];
  for (const l of leases) {
    const u = l.unit;
    const userOwnsBuilding = buildingOwnerSet.has(u.propertyId);
    const userOwnsUnit = u.ownerUserId === userId;
    if (!userOwnsUnit && !userOwnsBuilding) {
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
  if (b.ownedUnitIds.length > 0) {
    orClause.push({ unitId: { in: b.ownedUnitIds } });
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
    take: 80,
    include: { unit: { select: { unitNumber: true } } }
  });

  const operatorSet = new Set(op);
  const buildingOwnerSet = new Set(b.buildingOwnerPropertyIds);
  const ownedUnitSet = new Set(b.ownedUnitIds);

  const filtered = rows.filter((t) => {
    if (operatorSet.has(t.propertyId) && t.unitId == null) {
      return true;
    }
    if (buildingOwnerSet.has(t.propertyId)) {
      return true;
    }
    if (t.unitId && ownedUnitSet.has(t.unitId)) {
      return true;
    }
    return false;
  });

  return filtered.slice(0, 60).map((t) => ({
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
  const unitFinanceRows = await prisma.unit.findMany({
    where: { ownerUserId: userId, property: { ownerFinancialAccess: true } },
    select: { id: true, propertyId: true, property: { select: { ownerUserId: true } } }
  });

  const buildingManagedFinanceIds: string[] = [];
  const operatorFinanceIds: string[] = [];

  for (const p of financialProps) {
    if (isOperatorContract(p.ownerContractType)) {
      operatorFinanceIds.push(p.id);
    } else {
      buildingManagedFinanceIds.push(p.id);
    }
  }

  const unitOnlyFinanceUnitIds: string[] = [];
  for (const u of unitFinanceRows) {
    if (u.property.ownerUserId !== userId) {
      unitOnlyFinanceUnitIds.push(u.id);
    }
  }

  if (buildingManagedFinanceIds.length === 0 && unitOnlyFinanceUnitIds.length === 0 && operatorFinanceIds.length === 0) {
    return null;
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  const money = (n: { toString(): string } | number | null | undefined) =>
    n == null ? "0" : typeof n === "number" ? String(n) : n.toString();

  const buildingManagedClause =
    buildingManagedFinanceIds.length > 0
      ? ownerPropertyMoneyOrClauses(buildingManagedFinanceIds)
      : null;
  const unitOnlyClause =
    unitOnlyFinanceUnitIds.length > 0 ? ownerUnitMoneyOrClauses(unitOnlyFinanceUnitIds) : null;

  const operatorExpenseScope: Prisma.ExpenseWhereInput | null =
    operatorFinanceIds.length > 0
      ? {
          OR: OWNER_LIABILITY_CATEGORY_FILTERS.map((c) => ({
            category: { equals: c, mode: "insensitive" as const }
          })),
          ownerContract: {
            is: {
              ownerUserId: userId,
              contractType: { in: ["operator", "fixed_lease"] },
              propertyId: { in: operatorFinanceIds }
            }
          }
        }
      : null;

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

  const runManagedSlice = async (clause: { receipt: Prisma.ReceiptWhereInput; expense: Prisma.ExpenseWhereInput }) => {
    const [r1, e1, e2] = await Promise.all([
      prisma.receipt.aggregate({
        where: { ...baseReceiptWhere, ...clause.receipt },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { ...baseExpensePaid, ...clause.expense },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: buildPendingExpenseWhere(clause.expense),
        _sum: { amount: true }
      })
    ]);
    parts.push({ receipts: r1._sum.amount, expPaid: e1._sum.amount, expPending: e2._sum.amount });
  };

  if (buildingManagedClause) {
    await runManagedSlice(buildingManagedClause);
  }
  if (unitOnlyClause) {
    await runManagedSlice(unitOnlyClause);
  }
  if (operatorExpenseScope) {
    const [e1, e2] = await Promise.all([
      prisma.expense.aggregate({
        where: { ...baseExpensePaid, ...operatorExpenseScope },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: buildPendingExpenseWhere(operatorExpenseScope),
        _sum: { amount: true }
      })
    ]);
    parts.push({ receipts: 0, expPaid: e1._sum.amount, expPending: e2._sum.amount });
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

async function listOperatorFinancePropertyIdsForPortal(userId: string): Promise<string[]> {
  const rows = await prisma.property.findMany({
    where: { ownerUserId: userId, ownerFinancialAccess: true },
    select: { id: true, ownerContractType: true }
  });
  return rows.filter((r) => isOperatorContract(r.ownerContractType)).map((r) => r.id);
}

export type OwnerOperatorContractPaymentRow = {
  id: string;
  expenseDate: string;
  amount: string;
  paymentStatus: string;
  scopeLabel: string;
};

/** Installments the company owes this owner under operator (fixed-lease) owner contracts — not tenant rent. */
export async function listOwnerOperatorContractPayments(
  userId: string,
  sinceDays = 365
): Promise<OwnerOperatorContractPaymentRow[]> {
  const operatorPropertyIds = await listOperatorFinancePropertyIdsForPortal(userId);
  if (operatorPropertyIds.length === 0) {
    return [];
  }
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: since },
      OR: OWNER_LIABILITY_CATEGORY_FILTERS.map((c) => ({
        category: { equals: c, mode: "insensitive" as const }
      })),
      ownerContract: {
        is: {
          ownerUserId: userId,
          contractType: { in: ["operator", "fixed_lease"] },
          propertyId: { in: operatorPropertyIds }
        }
      },
      NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
    },
    orderBy: { expenseDate: "desc" },
    take: 200,
    include: {
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });

  return rows.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    amount: e.amount.toString(),
    paymentStatus: e.paymentStatus.trim().toLowerCase(),
    scopeLabel:
      e.unit && e.property
        ? `${e.property.code} · Unit ${e.unit.unitNumber}`
        : e.property
          ? `${e.property.code} · ${e.property.name}`
          : "—"
  }));
}
