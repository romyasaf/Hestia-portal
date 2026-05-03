import { formatFinanceMoney } from "@/lib/finance/format-money";
import { formatBuildingAddressLine } from "@/lib/portfolio/building-address";
import { formatResolvedOwnerLine, resolveUnitOwner } from "@/lib/portfolio/ownership";
import { leaseStatusActiveWhere } from "@/lib/leases/status";
import type { Prisma } from "@prisma/client";
import { parseStringArrayJson, unitListingDisplayPrice } from "@/lib/units/public-listing";
import { prisma } from "@/lib/prisma";

/** DB may lag Prisma schema (e.g. migration 025 not applied); cache optional `owner_contracts` columns per process. */
let ownerContractOptionalColsCache: { propertyScope: boolean; contractStatus: boolean } | null = null;

async function ownerContractOptionalColumns(): Promise<{
  propertyScope: boolean;
  contractStatus: boolean;
}> {
  if (ownerContractOptionalColsCache) {
    return ownerContractOptionalColsCache;
  }
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'owner_contracts'
      AND column_name IN ('property_scope', 'contract_status')
  `;
  const names = new Set(rows.map((r) => r.column_name));
  ownerContractOptionalColsCache = {
    propertyScope: names.has("property_scope"),
    contractStatus: names.has("contract_status")
  };
  return ownerContractOptionalColsCache;
}

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

const activeLeaseWhere = (today: Date) => ({
  status: leaseStatusActiveWhere(),
  startDate: { lte: today },
  endDate: { gte: today }
});

export type PortfolioTab =
  | "overview"
  | "buildings"
  | "units"
  | "owners"
  | "contracts"
  | "tenants"
  | "leases";

export function parsePortfolioTab(
  raw: string | string[] | undefined
): PortfolioTab {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "properties" || v === "buildings") {
    return "buildings";
  }
  if (v === "units" || v === "owners" || v === "contracts" || v === "tenants" || v === "leases") {
    return v;
  }
  return "overview";
}

export type AdminPortfolioSnapshot = {
  propertyCount: number;
  unitCount: number;
  propertiesWithOwner: number;
  activeLeaseCount: number;
  tenantAccountCount: number;
  occupiedUnitCount: number;
  vacantUnitCount: number;
  expiringLeaseCount: number;
};

export type PortfolioRecentLease = {
  id: string;
  status: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  tenantName: string;
  tenantId: string;
  unitNumber: string;
  unitId: string;
  propertyCode: string;
  propertyName: string;
  propertyId: string;
};

export type PortfolioVacantUnit = {
  id: string;
  unitNumber: string;
  unitStatus: string;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
};

export type PortfolioExpiringLease = {
  id: string;
  endDate: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  unitId: string;
};

export async function getAdminPortfolioSnapshot(): Promise<AdminPortfolioSnapshot> {
  const today = utcTodayDateOnly();
  const horizon = addUtcDays(today, 90);

  const [propertyCount, unitCount, propertiesWithOwner, activeLeaseCount, tenantRole, activeLeases] =
    await Promise.all([
      prisma.property.count(),
      prisma.unit.count(),
      prisma.property.count({ where: { ownerUserId: { not: null } } }),
      prisma.lease.count({ where: activeLeaseWhere(today) }),
      prisma.role.findUnique({ where: { code: "tenant" }, select: { id: true } }),
      prisma.lease.findMany({
        where: activeLeaseWhere(today),
        select: { unitId: true }
      })
    ]);

  const occupiedUnitIds = new Set(activeLeases.map((l) => l.unitId));
  const occupiedUnitCount = occupiedUnitIds.size;
  const vacantUnitCount = Math.max(0, unitCount - occupiedUnitCount);

  const expiringLeaseCount = await prisma.lease.count({
    where: {
      ...activeLeaseWhere(today),
      endDate: { lte: horizon }
    }
  });

  const tenantAccountCount = tenantRole
    ? await prisma.userRole.count({ where: { roleId: tenantRole.id } })
    : 0;

  return {
    propertyCount,
    unitCount,
    propertiesWithOwner,
    activeLeaseCount,
    tenantAccountCount,
    occupiedUnitCount,
    vacantUnitCount,
    expiringLeaseCount
  };
}

export async function getPortfolioRecentLeases(take = 6): Promise<PortfolioRecentLease[]> {
  const rows = await prisma.lease.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      createdAt: true,
      startDate: true,
      endDate: true,
      rentAmount: true,
      tenant: { select: { id: true, fullName: true } },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          property: { select: { id: true, code: true, name: true } }
        }
      }
    }
  });
  return rows.map((l) => ({
    id: l.id,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    startDate: l.startDate.toISOString().slice(0, 10),
    endDate: l.endDate.toISOString().slice(0, 10),
    rentAmount: l.rentAmount.toString(),
    tenantName: l.tenant.fullName,
    tenantId: l.tenant.id,
    unitNumber: l.unit.unitNumber,
    unitId: l.unit.id,
    propertyCode: l.unit.property.code,
    propertyName: l.unit.property.name,
    propertyId: l.unit.property.id
  }));
}

export async function getPortfolioVacantUnits(take = 8): Promise<PortfolioVacantUnit[]> {
  const today = utcTodayDateOnly();
  const active = await prisma.lease.findMany({
    where: activeLeaseWhere(today),
    select: { unitId: true }
  });
  const occupied = new Set(active.map((l) => l.unitId));
  const units = await prisma.unit.findMany({
    orderBy: [{ property: { code: "asc" } }, { unitNumber: "asc" }],
    take: 400,
    select: {
      id: true,
      unitNumber: true,
      status: true,
      propertyId: true,
      property: { select: { code: true, name: true } }
    }
  });
  return units
    .filter((u) => !occupied.has(u.id))
    .slice(0, take)
    .map((u) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      unitStatus: u.status,
      propertyId: u.propertyId,
      propertyCode: u.property.code,
      propertyName: u.property.name
    }));
}

export async function getPortfolioExpiringLeases(take = 8): Promise<PortfolioExpiringLease[]> {
  const today = utcTodayDateOnly();
  const horizon = addUtcDays(today, 90);
  const rows = await prisma.lease.findMany({
    where: {
      ...activeLeaseWhere(today),
      endDate: { lte: horizon }
    },
    orderBy: { endDate: "asc" },
    take,
    select: {
      id: true,
      endDate: true,
      tenant: { select: { fullName: true } },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          property: { select: { name: true } }
        }
      }
    }
  });
  return rows.map((l) => ({
    id: l.id,
    endDate: l.endDate.toISOString().slice(0, 10),
    tenantName: l.tenant.fullName,
    unitNumber: l.unit.unitNumber,
    propertyName: l.unit.property.name,
    unitId: l.unit.id
  }));
}

export type PortfolioPropertyRow = {
  id: string;
  code: string;
  name: string;
  formattedAddress: string;
  unitCount: number;
  occupiedUnits: number;
  ownerFinancialAccess: boolean;
  owner: { id: string; fullName: string; email: string } | null;
  /** Human-readable mix of building-level vs unit-level ownership. */
  ownershipSummary: string;
  /** True only when the building and all its units have no leases, tickets, expenses, or owner contracts. */
  canHardDeleteProperty: boolean;
};

function summarizeBuildingOwnership(
  buildingOwner: { id: string } | null,
  units: { id: string; ownerUserId: string | null }[]
): string {
  const n = units.length;
  const withDirect = units.filter((u) => u.ownerUserId != null).length;
  const hasBuilding = Boolean(buildingOwner);
  if (!hasBuilding && withDirect === 0) {
    return n ? "No owner assigned (building or units)" : "No units yet";
  }
  if (hasBuilding && withDirect === 0) {
    return n ? "All units inherit building owner" : "Building owner only (no units)";
  }
  if (!hasBuilding && withDirect > 0) {
    return withDirect === n ? "Unit-level owners only" : `${withDirect} direct · ${n - withDirect} unassigned`;
  }
  if (withDirect === 0) {
    return "All units inherit building owner";
  }
  if (withDirect === n) {
    return "Each unit has a direct owner (overrides building)";
  }
  return `${withDirect} unit-level · ${n - withDirect} inherit building`;
}

export async function listPortfolioPropertyRows(filters?: { q?: string }): Promise<PortfolioPropertyRow[]> {
  const today = utcTodayDateOnly();
  const activeLeases = await prisma.lease.findMany({
    where: activeLeaseWhere(today),
    select: { unitId: true }
  });
  const occupiedUnits = new Set(activeLeases.map((l) => l.unitId));

  const bq = filters?.q?.trim().toLowerCase();
  const properties = await prisma.property.findMany({
    where: bq
      ? {
          OR: [
            { name: { contains: bq, mode: "insensitive" } },
            { code: { contains: bq, mode: "insensitive" } },
            { addressStreet: { contains: bq, mode: "insensitive" } },
            { city: { contains: bq, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { code: "asc" },
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
      owner: { select: { id: true, fullName: true, email: true } },
      units: {
        select: {
          id: true,
          ownerUserId: true,
          _count: {
            select: { leases: true, expenses: true, ownerContracts: true, tickets: true, jobs: true }
          }
        }
      },
      _count: { select: { tickets: true, expenses: true, ownerContracts: true, jobs: true } }
    }
  });

  return properties.map((p) => {
    const unitBlocked = p.units.some(
      (u) =>
        u._count.leases +
          u._count.expenses +
          u._count.ownerContracts +
          u._count.tickets +
          u._count.jobs >
        0
    );
    const propBlocked =
      p._count.tickets + p._count.expenses + p._count.ownerContracts + p._count.jobs > 0 || unitBlocked;
    const canHardDeleteProperty = !propBlocked;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      formattedAddress: formatBuildingAddressLine(p),
      unitCount: p.units.length,
      occupiedUnits: p.units.filter((u) => occupiedUnits.has(u.id)).length,
      ownerFinancialAccess: p.ownerFinancialAccess,
      owner: p.owner,
      ownershipSummary: summarizeBuildingOwnership(p.owner, p.units),
      canHardDeleteProperty
    };
  });
}

export type PortfolioUnitOccupancy = "all" | "occupied" | "vacant";

export type PortfolioUnitRow = {
  id: string;
  unitNumber: string;
  unitStatus: string;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
  occupancy: "occupied" | "vacant";
  /** Listing title when set, else a sensible default for cards. */
  marketingTitle: string;
  listingCoverImageUrl: string | null;
  /** Formatted QAR rent / listing price when present. */
  displayPriceLabel: string;
  lease: {
    id: string;
    status: string;
    endDate: string;
    tenantName: string;
    tenantId: string;
  } | null;
  directUnitOwner: { id: string; fullName: string; email: string } | null;
  buildingOwner: { id: string; fullName: string; email: string } | null;
  resolvedOwnerLabel: string;
  resolvedOwnerSource: "unit" | "building" | "none";
  linkedHistoryCount: number;
  canHardDeleteUnit: boolean;
};

export async function listPortfolioUnitRows(filters: {
  propertyId?: string;
  occupancy?: PortfolioUnitOccupancy;
  q?: string;
}): Promise<PortfolioUnitRow[]> {
  const today = utcTodayDateOnly();
  const activeLeases = await prisma.lease.findMany({
    where: activeLeaseWhere(today),
    select: {
      id: true,
      unitId: true,
      status: true,
      endDate: true,
      tenant: { select: { id: true, fullName: true } },
      unit: { select: { id: true } }
    }
  });
  const leaseByUnit = new Map<
    string,
    { id: string; status: string; endDate: Date; tenantName: string; tenantId: string }
  >();
  for (const l of activeLeases) {
    leaseByUnit.set(l.unitId, {
      id: l.id,
      status: l.status,
      endDate: l.endDate,
      tenantName: l.tenant.fullName,
      tenantId: l.tenant.id
    });
  }

  const q = filters.q?.trim().toLowerCase();
  const units = await prisma.unit.findMany({
    where: {
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(q
        ? {
            OR: [
              { unitNumber: { contains: q, mode: "insensitive" } },
              { listingTitle: { contains: q, mode: "insensitive" } },
              { property: { name: { contains: q, mode: "insensitive" } } },
              { property: { code: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: [{ property: { code: "asc" } }, { unitNumber: "asc" }],
    take: 400,
    select: {
      id: true,
      unitNumber: true,
      status: true,
      propertyId: true,
      listingTitle: true,
      listingCoverImageUrl: true,
      listingMonthlyPrice: true,
      monthlyRent: true,
      ownerUserId: true,
      owner: { select: { id: true, fullName: true, email: true } },
      property: {
        select: {
          code: true,
          name: true,
          ownerUserId: true,
          owner: { select: { id: true, fullName: true, email: true } }
        }
      },
      _count: {
        select: { leases: true, expenses: true, ownerContracts: true, tickets: true, jobs: true }
      }
    }
  });

  let rows: PortfolioUnitRow[] = units.map((u) => {
    const l = leaseByUnit.get(u.id);
    const resolved = resolveUnitOwner({
      unitOwnerUserId: u.ownerUserId,
      unitOwner: u.owner ? { fullName: u.owner.fullName, email: u.owner.email } : null,
      buildingOwnerUserId: u.property.ownerUserId,
      buildingOwner: u.property.owner
        ? { fullName: u.property.owner.fullName, email: u.property.owner.email }
        : null
    });
    const src = resolved.source ?? "none";
    const price = unitListingDisplayPrice(u);
    const displayPriceLabel =
      price == null || Number(price) <= 0 ? "—" : formatFinanceMoney(Number(price));
    const marketingTitle = u.listingTitle?.trim() || `Unit ${u.unitNumber}`;
    const linkedHistoryCount =
      u._count.leases +
      u._count.expenses +
      u._count.ownerContracts +
      u._count.tickets +
      u._count.jobs;
    const canHardDeleteUnit = linkedHistoryCount === 0;
    return {
      id: u.id,
      unitNumber: u.unitNumber,
      unitStatus: u.status,
      propertyId: u.propertyId,
      propertyCode: u.property.code,
      propertyName: u.property.name,
      marketingTitle,
      listingCoverImageUrl: u.listingCoverImageUrl?.trim() || null,
      displayPriceLabel,
      occupancy: l ? "occupied" : "vacant",
      lease: l
        ? {
            id: l.id,
            status: l.status,
            endDate: l.endDate.toISOString().slice(0, 10),
            tenantName: l.tenantName,
            tenantId: l.tenantId
          }
        : null,
      directUnitOwner: u.owner,
      buildingOwner: u.property.owner,
      resolvedOwnerLabel: formatResolvedOwnerLine(resolved),
      resolvedOwnerSource: src,
      linkedHistoryCount,
      canHardDeleteUnit
    };
  });

  if (filters.occupancy === "occupied") {
    rows = rows.filter((r) => r.occupancy === "occupied");
  } else if (filters.occupancy === "vacant") {
    rows = rows.filter((r) => r.occupancy === "vacant");
  }
  return rows;
}

export type PortfolioOwnerRow = {
  userId: string;
  fullName: string;
  email: string;
  buildingsOwned: number;
  unitsOnOwnedBuildings: number;
  unitsOwnedDirectly: number;
};

export async function listPortfolioOwnerRows(filters?: { q?: string }): Promise<PortfolioOwnerRow[]> {
  const oq = filters?.q?.trim().toLowerCase();
  const owners = await prisma.user.findMany({
    where: {
      userRoles: { some: { role: { code: "owner" } } },
      isActive: true,
      ...(oq
        ? {
            OR: [
              { fullName: { contains: oq, mode: "insensitive" } },
              { email: { contains: oq, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      ownedProperties: {
        select: {
          id: true,
          _count: { select: { units: true } }
        }
      }
    },
    take: 200
  });
  const ownerIds = owners.map((o) => o.id);
  const directUnitCounts =
    ownerIds.length === 0
      ? []
      : await prisma.unit.groupBy({
          by: ["ownerUserId"],
          where: { ownerUserId: { in: ownerIds } },
          _count: { _all: true }
        });
  const unitsOwnedDirectlyByUserId = new Map(
    directUnitCounts
      .filter((r): r is typeof r & { ownerUserId: string } => r.ownerUserId != null)
      .map((r) => [r.ownerUserId, r._count._all])
  );
  return owners.map((o) => ({
    userId: o.id,
    fullName: o.fullName,
    email: o.email,
    buildingsOwned: o.ownedProperties.length,
    unitsOnOwnedBuildings: o.ownedProperties.reduce((s, p) => s + p._count.units, 0),
    unitsOwnedDirectly: unitsOwnedDirectlyByUserId.get(o.id) ?? 0
  }));
}

export type PortfolioTenantRow = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    unitNumber: string;
    propertyName: string;
    unitId: string;
  } | null;
};

export async function listPortfolioTenantRows(filters?: { q?: string }): Promise<PortfolioTenantRow[]> {
  const today = utcTodayDateOnly();
  const tq = filters?.q?.trim().toLowerCase();
  const tenants = await prisma.user.findMany({
    where: {
      userRoles: { some: { role: { code: "tenant" } } },
      ...(tq
        ? {
            OR: [
              { fullName: { contains: tq, mode: "insensitive" } },
              { email: { contains: tq, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isActive: true,
      leasesAsTenant: {
        where: activeLeaseWhere(today),
        take: 1,
        orderBy: { endDate: "desc" },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: { select: { name: true } }
            }
          }
        }
      }
    },
    take: 250
  });

  return tenants.map((t) => {
    const l = t.leasesAsTenant[0];
    return {
      userId: t.id,
      fullName: t.fullName,
      email: t.email,
      phone: t.phone,
      isActive: t.isActive,
      lease: l
        ? {
            id: l.id,
            status: l.status,
            startDate: l.startDate.toISOString().slice(0, 10),
            endDate: l.endDate.toISOString().slice(0, 10),
            unitNumber: l.unit.unitNumber,
            propertyName: l.unit.property.name,
            unitId: l.unit.id
          }
        : null
    };
  });
}

export type PortfolioLeaseFilter = {
  propertyId?: string;
  status?: string;
  q?: string;
};

export type PortfolioLeaseRow = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  tenantName: string;
  tenantId: string;
  unitNumber: string;
  unitId: string;
  propertyCode: string;
  propertyName: string;
  propertyId: string;
};

export async function listPortfolioLeaseRows(f: PortfolioLeaseFilter): Promise<PortfolioLeaseRow[]> {
  const q = f.q?.trim().toLowerCase();
  const rows = await prisma.lease.findMany({
    where: {
      ...(f.propertyId ? { unit: { propertyId: f.propertyId } } : {}),
      ...(f.status
        ? { status: { equals: f.status, mode: "insensitive" as const } }
        : {}),
      ...(q
        ? {
            OR: [
              { tenant: { fullName: { contains: q, mode: "insensitive" } } },
              { tenant: { email: { contains: q, mode: "insensitive" } } },
              { unit: { unitNumber: { contains: q, mode: "insensitive" } } },
              { unit: { property: { name: { contains: q, mode: "insensitive" } } } },
              { unit: { property: { code: { contains: q, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    orderBy: { endDate: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      rentAmount: true,
      tenant: { select: { id: true, fullName: true } },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          property: { select: { id: true, code: true, name: true } }
        }
      }
    }
  });
  return rows.map((l) => ({
    id: l.id,
    status: l.status,
    startDate: l.startDate.toISOString().slice(0, 10),
    endDate: l.endDate.toISOString().slice(0, 10),
    rentAmount: l.rentAmount.toString(),
    tenantName: l.tenant.fullName,
    tenantId: l.tenant.id,
    unitNumber: l.unit.unitNumber,
    unitId: l.unit.id,
    propertyCode: l.unit.property.code,
    propertyName: l.unit.property.name,
    propertyId: l.unit.property.id
  }));
}

export type PortfolioPropertyDetail = {
  id: string;
  code: string;
  name: string;
  formattedAddress: string;
  ownerFinancialAccess: boolean;
  owner: { id: string; fullName: string; email: string } | null;
  units: {
    id: string;
    unitNumber: string;
    status: string;
    occupancy: "occupied" | "vacant";
    directUnitOwner: { id: string; fullName: string; email: string } | null;
    resolvedOwnerLabel: string;
    resolvedOwnerSource: "unit" | "building" | "none";
    activeLease: {
      id: string;
      status: string;
      tenantName: string;
      tenantId: string;
      startDate: string;
      endDate: string;
      rentAmount: string;
    } | null;
  }[];
};

export async function getPortfolioPropertyDetail(propertyId: string): Promise<PortfolioPropertyDetail | null> {
  const today = utcTodayDateOnly();
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
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
      owner: { select: { id: true, fullName: true, email: true } },
      units: {
        orderBy: { unitNumber: "asc" },
        select: {
          id: true,
          unitNumber: true,
          status: true,
          ownerUserId: true,
          owner: { select: { id: true, fullName: true, email: true } },
          leases: {
            where: activeLeaseWhere(today),
            take: 1,
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              rentAmount: true,
              tenant: { select: { id: true, fullName: true } }
            }
          }
        }
      }
    }
  });
  if (!p) {
    return null;
  }
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    formattedAddress: formatBuildingAddressLine(p),
    ownerFinancialAccess: p.ownerFinancialAccess,
    owner: p.owner,
    units: p.units.map((u) => {
      const l = u.leases[0];
      const resolved = resolveUnitOwner({
        unitOwnerUserId: u.ownerUserId,
        unitOwner: u.owner ? { fullName: u.owner.fullName, email: u.owner.email } : null,
        buildingOwnerUserId: p.owner?.id ?? null,
        buildingOwner: p.owner ? { fullName: p.owner.fullName, email: p.owner.email } : null
      });
      return {
        id: u.id,
        unitNumber: u.unitNumber,
        status: u.status,
        occupancy: l ? "occupied" : "vacant",
        directUnitOwner: u.owner,
        resolvedOwnerLabel: formatResolvedOwnerLine(resolved),
        resolvedOwnerSource: resolved.source ?? "none",
        activeLease: l
          ? {
              id: l.id,
              status: l.status,
              tenantName: l.tenant.fullName,
              tenantId: l.tenant.id,
              startDate: l.startDate.toISOString().slice(0, 10),
              endDate: l.endDate.toISOString().slice(0, 10),
              rentAmount: l.rentAmount.toString()
            }
          : null
      };
    })
  };
}

export type PortfolioContractListFilter = {
  q?: string;
  ownerUserId?: string;
  propertyId?: string;
};

export type PortfolioContractRow = {
  id: string;
  contractType: string;
  propertyScope: string | null;
  contractStatus: string | null;
  startDate: string;
  endDate: string;
  amount: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  propertyId: string | null;
  propertyCode: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitNumber: string | null;
};

export async function listPortfolioContractRows(
  f: PortfolioContractListFilter
): Promise<PortfolioContractRow[]> {
  const q = f.q?.trim().toLowerCase();
  const opts = await ownerContractOptionalColumns();

  const select: Prisma.OwnerContractSelect = {
    id: true,
    contractType: true,
    startDate: true,
    endDate: true,
    amount: true,
    ownerUserId: true,
    owner: { select: { fullName: true, email: true } },
    property: { select: { id: true, code: true, name: true } },
    unit: { select: { id: true, unitNumber: true } }
  };
  if (opts.propertyScope) {
    select.propertyScope = true;
  }
  if (opts.contractStatus) {
    select.contractStatus = true;
  }

  const rows = await prisma.ownerContract.findMany({
    where: {
      ...(f.ownerUserId ? { ownerUserId: f.ownerUserId } : {}),
      ...(f.propertyId ? { propertyId: f.propertyId } : {}),
      ...(q
        ? {
            OR: [
              { owner: { fullName: { contains: q, mode: "insensitive" } } },
              { owner: { email: { contains: q, mode: "insensitive" } } },
              { property: { name: { contains: q, mode: "insensitive" } } },
              { property: { code: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    take: 250,
    select
  });

  return rows.map((r) => {
    const propertyScope = opts.propertyScope
      ? (r as { propertyScope?: string | null }).propertyScope ?? null
      : null;
    const contractStatus = opts.contractStatus
      ? (r as { contractStatus?: string | null }).contractStatus ?? null
      : null;
    return {
      id: r.id,
      contractType: r.contractType,
      propertyScope,
      contractStatus,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      amount: r.amount.toString(),
      ownerUserId: r.ownerUserId,
      ownerName: r.owner.fullName,
      ownerEmail: r.owner.email,
      propertyId: r.property?.id ?? null,
      propertyCode: r.property?.code ?? null,
      propertyName: r.property?.name ?? null,
      unitId: r.unit?.id ?? null,
      unitNumber: r.unit?.unitNumber ?? null
    };
  });
}

export async function listPropertiesForPortfolioFilters() {
  return prisma.property.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true }
  });
}
