import type { Prisma } from "@prisma/client";
import { parseAppliesToUnitIds } from "@/lib/owner/applies-to-units";
import { OWNER_LIABILITY_CATEGORY_FILTERS } from "@/lib/owner/finance-categories";
import { formatBuildingAddressLine } from "@/lib/portfolio/building-address";
import { prisma } from "@/lib/prisma";

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type AdminOwnerContractRow = {
  id: string;
  contractType: string;
  propertyScope: string | null;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  amount: string;
  managementFeeStructure: string | null;
  managementFeePercentage: string | null;
  monthlyManagementFeeAmount: string | null;
  revenueCalculationMethod: string | null;
  documentUrl: string | null;
  notes: string | null;
  property: { id: string; code: string; name: string } | null;
  unit: { id: string; unitNumber: string; property: { code: string; name: string } } | null;
  /** Parsed `applies_to_unit_ids` when the agreement covers multiple units. */
  appliesToUnitIds: string[] | null;
  /** Human-readable unit numbers for covered units (single or multi). */
  coveredUnitsSummary: string | null;
  expenseCount: number;
};

export async function listOwnerContractsForAdmin(ownerUserId: string): Promise<AdminOwnerContractRow[]> {
  const rows = await prisma.ownerContract.findMany({
    where: { ownerUserId },
    orderBy: { startDate: "desc" },
    include: {
      property: { select: { id: true, code: true, name: true } },
      unit: { select: { id: true, unitNumber: true, property: { select: { code: true, name: true } } } },
      _count: { select: { expenses: true } }
    }
  });

  const extraIds = new Set<string>();
  for (const r of rows) {
    for (const id of parseAppliesToUnitIds(r.appliesToUnitIds)) {
      extraIds.add(id);
    }
  }
  const extraUnits =
    extraIds.size > 0
      ? await prisma.unit.findMany({
          where: { id: { in: [...extraIds] } },
          select: { id: true, unitNumber: true }
        })
      : [];
  const unitNumberById = new Map(extraUnits.map((u) => [u.id, u.unitNumber]));

  return rows.map((r) => {
    const parsedIds = parseAppliesToUnitIds(r.appliesToUnitIds);
    let coveredUnitsSummary: string | null = null;
    if (parsedIds.length > 0) {
      coveredUnitsSummary = parsedIds.map((id) => unitNumberById.get(id) ?? id).join(", ");
    } else if (r.unit) {
      coveredUnitsSummary = r.unit.unitNumber;
    }
    return {
      id: r.id,
      contractType: r.contractType,
      propertyScope: r.propertyScope,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      paymentFrequency: r.paymentFrequency,
      amount: r.amount.toString(),
      managementFeeStructure: r.managementFeeStructure,
      managementFeePercentage: r.managementFeePercentage?.toString() ?? null,
      monthlyManagementFeeAmount: r.monthlyManagementFeeAmount?.toString() ?? null,
      revenueCalculationMethod: r.revenueCalculationMethod,
      documentUrl: r.documentUrl,
      notes: r.notes,
      property: r.property,
      unit: r.unit,
      appliesToUnitIds: parsedIds.length > 0 ? parsedIds : null,
      coveredUnitsSummary,
      expenseCount: r._count.expenses
    };
  });
}

export type AdminOwnerObligationSummary = {
  pendingCount: number;
  pendingAmount: string;
  upcomingCount: number;
  upcomingAmount: string;
  overdueCount: number;
  overdueAmount: string;
};

const pendingLike: Prisma.ExpenseWhereInput = {
  OR: [
    { paymentStatus: { equals: "pending", mode: "insensitive" } },
    { paymentStatus: { equals: "approved", mode: "insensitive" } }
  ]
};

const ownerLiabilityCategoryClause: Prisma.ExpenseWhereInput = {
  OR: OWNER_LIABILITY_CATEGORY_FILTERS.map((c) => ({
    category: { equals: c, mode: "insensitive" as const }
  }))
};

export async function getOwnerContractObligationSummary(ownerUserId: string): Promise<AdminOwnerObligationSummary> {
  const today = utcTodayDateOnly();
  const base: Prisma.ExpenseWhereInput = {
    ownerContract: { is: { ownerUserId } },
    AND: [ownerLiabilityCategoryClause, pendingLike],
    NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
  };

  const upWhere = { ...base, expenseDate: { gte: today } };
  const overWhere = { ...base, expenseDate: { lt: today } };

  const [upCount, upSum, overCount, overSum, pendCount, pendSum] = await Promise.all([
    prisma.expense.count({ where: upWhere }),
    prisma.expense.aggregate({ where: upWhere, _sum: { amount: true } }),
    prisma.expense.count({ where: overWhere }),
    prisma.expense.aggregate({ where: overWhere, _sum: { amount: true } }),
    prisma.expense.count({ where: base }),
    prisma.expense.aggregate({ where: base, _sum: { amount: true } })
  ]);

  const sumStr = (v: unknown) => (v == null ? "0" : String(v));

  return {
    pendingCount: pendCount,
    pendingAmount: sumStr(pendSum._sum.amount),
    upcomingCount: upCount,
    upcomingAmount: sumStr(upSum._sum.amount),
    overdueCount: overCount,
    overdueAmount: sumStr(overSum._sum.amount)
  };
}

export type AdminOwnerPortfolioBuilding = {
  id: string;
  code: string;
  name: string;
  formattedAddress: string;
};

export type AdminOwnerPortfolioUnit = {
  id: string;
  unitNumber: string;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
};

export async function getOwnerPortfolioForContracts(ownerUserId: string): Promise<{
  buildings: AdminOwnerPortfolioBuilding[];
  units: AdminOwnerPortfolioUnit[];
}> {
  const [buildingsFromRole, units] = await Promise.all([
    prisma.property.findMany({
      where: { ownerUserId },
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
        city: true
      }
    }),
    prisma.unit.findMany({
      where: { ownerUserId },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
      select: {
        id: true,
        unitNumber: true,
        propertyId: true,
        property: { select: { code: true, name: true } }
      }
    })
  ]);

  const buildingIds = new Set(buildingsFromRole.map((b) => b.id));
  const extraPropertyIds = [...new Set(units.map((u) => u.propertyId))].filter((id) => !buildingIds.has(id));
  const extraBuildings =
    extraPropertyIds.length === 0
      ? []
      : await prisma.property.findMany({
          where: { id: { in: extraPropertyIds } },
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
            city: true
          }
        });

  const allBuildings = [...buildingsFromRole, ...extraBuildings].sort((a, b) => a.name.localeCompare(b.name));

  return {
    buildings: allBuildings.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      formattedAddress: formatBuildingAddressLine(b)
    })),
    units: units.map((u) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      propertyId: u.propertyId,
      propertyCode: u.property.code,
      propertyName: u.property.name
    }))
  };
}

export type AdminOwnerContractExpenseRow = {
  id: string;
  expenseDate: string;
  amount: string;
  paymentStatus: string;
  ownerContractId: string;
  contractType: string;
  buildingLine: string;
};

export async function listUpcomingOwnerContractExpenses(
  ownerUserId: string,
  take = 40
): Promise<AdminOwnerContractExpenseRow[]> {
  const today = utcTodayDateOnly();
  const rows = await prisma.expense.findMany({
    where: {
      ownerContract: { is: { ownerUserId } },
      expenseDate: { gte: today },
      ...pendingLike,
      NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
    },
    orderBy: { expenseDate: "asc" },
    take,
    include: {
      ownerContract: { select: { id: true, contractType: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });
  return rows.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    amount: e.amount.toString(),
    paymentStatus: e.paymentStatus.trim().toLowerCase(),
    ownerContractId: e.ownerContract!.id,
    contractType: e.ownerContract!.contractType,
    buildingLine:
      e.unit && e.property
        ? `${e.property.code} · Unit ${e.unit.unitNumber} · ${e.property.name}`
        : e.property
          ? `${e.property.code} · ${e.property.name}`
          : "—"
  }));
}

export async function listOverdueOwnerContractExpenses(
  ownerUserId: string,
  take = 40
): Promise<AdminOwnerContractExpenseRow[]> {
  const today = utcTodayDateOnly();
  const rows = await prisma.expense.findMany({
    where: {
      ownerContract: { is: { ownerUserId } },
      expenseDate: { lt: today },
      ...pendingLike,
      NOT: { paymentStatus: { equals: "voided", mode: "insensitive" } }
    },
    orderBy: { expenseDate: "asc" },
    take,
    include: {
      ownerContract: { select: { id: true, contractType: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });
  return rows.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    amount: e.amount.toString(),
    paymentStatus: e.paymentStatus.trim().toLowerCase(),
    ownerContractId: e.ownerContract!.id,
    contractType: e.ownerContract!.contractType,
    buildingLine:
      e.unit && e.property
        ? `${e.property.code} · Unit ${e.unit.unitNumber} · ${e.property.name}`
        : e.property
          ? `${e.property.code} · ${e.property.name}`
          : "—"
  }));
}
