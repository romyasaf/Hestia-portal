import { Prisma } from "@prisma/client";
import {
  ownerAgreementTypeLabel,
  parseStoredOwnerAgreementType
} from "@/lib/owner/agreement-contract";
import { propertyScopeLabel } from "@/lib/owner/property-scope";
import {
  feeCalculationBasisLabel,
  formatMoneyQarForDisplay,
  formatPercentageForDisplay,
  managementFeeStructureLabel,
  parseManagementFeeStructure
} from "@/lib/owner/management-fee";
import { formatBuildingAddressLine } from "@/lib/portfolio/building-address";
import { resolveUnitOwner, formatResolvedOwnerLine } from "@/lib/portfolio/ownership";
import { activeCalendarLeaseWhere, utcTodayDateOnly } from "@/lib/units/public-listing";
import { getTableColumnSet, propertyTypeSelect } from "@/lib/db/table-columns";
import { prisma } from "@/lib/prisma";

export async function listPropertiesForSelect() {
  return prisma.property.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true }
  });
}

export type AdminBuildingWithUnitsOption = {
  id: string;
  label: string;
  propertyType: string;
  units: { id: string; unitNumber: string }[];
};

/** Buildings and their units for the create-owner flow (ownership scope + multi-unit assignment). */
export async function listBuildingsWithUnitsForOwnerForm(): Promise<AdminBuildingWithUnitsOption[]> {
  const propertyCols = await getTableColumnSet("properties");
  const rows = await prisma.property.findMany({
    orderBy: { name: "asc" },
    take: 400,
    select: {
      id: true,
      code: true,
      name: true,
      ...propertyTypeSelect(propertyCols),
      units: {
        orderBy: { unitNumber: "asc" },
        select: { id: true, unitNumber: true }
      }
    }
  });
  return rows.map((p) => ({
    id: p.id,
    label: `${p.code} · ${p.name}`,
    propertyType: (p as { propertyType?: string | null }).propertyType ?? "apartment_building",
    units: p.units.map((u) => ({ id: u.id, unitNumber: u.unitNumber }))
  }));
}

/** All buildings (properties) for attaching a unit. */
export async function listBuildingsForUnitForm() {
  return prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      ownerUserId: true,
      owner: { select: { fullName: true, email: true } }
    },
    take: 400
  });
}

export type AdminLeaseUnitOption = {
  id: string;
  label: string;
  buildingLine: string;
  resolvedOwnerLine: string;
  ownerSource: "unit" | "building" | "none";
};

/** Units available for lease forms, with owner resolved from unit then building. */
export async function listUnitsForLeaseForm(): Promise<AdminLeaseUnitOption[]> {
  const rows = await prisma.unit.findMany({
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    take: 500,
    include: {
      owner: { select: { fullName: true, email: true } },
      property: {
        select: {
          code: true,
          name: true,
          ownerUserId: true,
          owner: { select: { fullName: true, email: true } }
        }
      }
    }
  });

  return rows.map((u) => {
    const r = resolveUnitOwner({
      unitOwnerUserId: u.ownerUserId,
      unitOwner: u.owner ? { fullName: u.owner.fullName, email: u.owner.email } : null,
      buildingOwnerUserId: u.property.ownerUserId,
      buildingOwner: u.property.owner
        ? { fullName: u.property.owner.fullName, email: u.property.owner.email }
        : null
    });
    return {
      id: u.id,
      label: `${u.property.code} · Unit ${u.unitNumber} — ${u.property.name}`,
      buildingLine: `${u.property.code} · ${u.property.name}`,
      resolvedOwnerLine: formatResolvedOwnerLine(r),
      ownerSource: r.source ?? "none"
    };
  });
}

/** Users with the owner role — for assigning to properties. */
export async function listOwnerUsersForSelect() {
  return prisma.user.findMany({
    where: { isActive: true, userRoles: { some: { role: { code: "owner" } } } },
    orderBy: { fullName: "asc" },
    select: { id: true, email: true, fullName: true }
  });
}

export type AdminOwnerDirectoryRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  ownerType: string;
  /** QID for individuals, CR for companies. */
  idNumber: string | null;
  propertyScopeLabel: string | null;
  locationSummary: string | null;
  contractTypeLabel: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  fixedLeaseAmountDisplay: string | null;
  /** Shown for property management agreements on the primary (display) contract. */
  managementFeeStructureLabel: string | null;
  managementFeePercentageDisplay: string | null;
  monthlyManagementFeeDisplay: string | null;
  revenueCalculationMethodLabel: string | null;
  /** Active when any agreement covers today (start ≤ today ≤ end). */
  ownerStatus: "Active" | "Inactive";
  loginActive: boolean;
};

function isContractActiveToday(start: Date, end: Date, today: Date): boolean {
  return start <= today && end >= today;
}

type OwnerContractPickRow = {
  contractType: string;
  startDate: Date;
  endDate: Date;
  managementFeeStructure: string | null;
  managementFeePercentage: { toString(): string } | null;
  monthlyManagementFeeAmount: { toString(): string } | null;
  revenueCalculationMethod: string | null;
  propertyScope: string | null;
  amount: { toString(): string };
  property: { code: string; name: string } | null;
  unit: { unitNumber: string } | null;
};

function pickDisplayContract(contracts: OwnerContractPickRow[], today: Date): OwnerContractPickRow | null {
  if (contracts.length === 0) {
    return null;
  }
  const active = contracts.find((c) => isContractActiveToday(c.startDate, c.endDate, today));
  if (active) {
    return active;
  }
  const sorted = [...contracts].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return sorted[0] ?? null;
}

function contractLocationSummary(display: OwnerContractPickRow | null): string | null {
  if (!display) {
    return null;
  }
  const b = display.property ? `${display.property.code} · ${display.property.name}` : "";
  if (display.unit) {
    return b ? `${b} · Unit ${display.unit.unitNumber}` : `Unit ${display.unit.unitNumber}`;
  }
  return b || null;
}

function fixedLeaseAmountDirectory(display: OwnerContractPickRow | null): string | null {
  if (!display) {
    return null;
  }
  const t = parseStoredOwnerAgreementType(display.contractType);
  if (t !== "fixed_lease" && t !== "operator") {
    return null;
  }
  const n = Number(display.amount.toString());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return formatMoneyQarForDisplay(display.amount);
}

function pmDirectoryFeeFields(display: OwnerContractPickRow | null): {
  managementFeeStructureLabel: string | null;
  managementFeePercentageDisplay: string | null;
  monthlyManagementFeeDisplay: string | null;
  revenueCalculationMethodLabel: string | null;
} {
  if (!display || parseStoredOwnerAgreementType(display.contractType) !== "property_management") {
    return {
      managementFeeStructureLabel: null,
      managementFeePercentageDisplay: null,
      monthlyManagementFeeDisplay: null,
      revenueCalculationMethodLabel: null
    };
  }
  const structure = parseManagementFeeStructure(display.managementFeeStructure);
  const pct =
    structure === "percentage" || structure === "hybrid"
      ? formatPercentageForDisplay(display.managementFeePercentage)
      : null;
  const monthly =
    structure === "fixed_monthly" || structure === "hybrid"
      ? formatMoneyQarForDisplay(display.monthlyManagementFeeAmount)
      : null;
  return {
    managementFeeStructureLabel: managementFeeStructureLabel(display.managementFeeStructure),
    managementFeePercentageDisplay: pct,
    monthlyManagementFeeDisplay: monthly,
    revenueCalculationMethodLabel: feeCalculationBasisLabel(display.revenueCalculationMethod)
  };
}

/** Owner directory for admin list: profile, primary agreement row, contract-derived status. */
export async function listOwnerUsersForAdmin(): Promise<AdminOwnerDirectoryRow[]> {
  const today = utcTodayDateOnly();
  const rows = await prisma.user.findMany({
    where: { userRoles: { some: { role: { code: "owner" } } } },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      ownerProfile: {
        select: {
          ownerType: true,
          qidNumber: true,
          commercialRegistrationNumber: true
        }
      },
      ownerContracts: {
        select: {
          contractType: true,
          startDate: true,
          endDate: true,
          propertyScope: true,
          amount: true,
          managementFeeStructure: true,
          managementFeePercentage: true,
          monthlyManagementFeeAmount: true,
          revenueCalculationMethod: true,
          property: { select: { code: true, name: true } },
          unit: { select: { unitNumber: true } }
        },
        orderBy: { startDate: "desc" },
        take: 40
      }
    }
  });

  return rows.map((u) => {
    const profile = u.ownerProfile;
    const ownerType = profile?.ownerType ?? "individual";
    const idNumber =
      ownerType === "company"
        ? (profile?.commercialRegistrationNumber?.trim() || null)
        : (profile?.qidNumber?.trim() || null);
    const display = pickDisplayContract(u.ownerContracts, today);
    const pmFees = pmDirectoryFeeFields(display);
    const hasActive = u.ownerContracts.some((c) => isContractActiveToday(c.startDate, c.endDate, today));
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      ownerType,
      idNumber,
      propertyScopeLabel: display ? propertyScopeLabel(display.propertyScope) : null,
      locationSummary: contractLocationSummary(display),
      contractTypeLabel: display ? ownerAgreementTypeLabel(display.contractType) : null,
      contractStart: display ? display.startDate.toISOString().slice(0, 10) : null,
      contractEnd: display ? display.endDate.toISOString().slice(0, 10) : null,
      fixedLeaseAmountDisplay: fixedLeaseAmountDirectory(display),
      managementFeeStructureLabel: pmFees.managementFeeStructureLabel,
      managementFeePercentageDisplay: pmFees.managementFeePercentageDisplay,
      monthlyManagementFeeDisplay: pmFees.monthlyManagementFeeDisplay,
      revenueCalculationMethodLabel: pmFees.revenueCalculationMethodLabel,
      ownerStatus: hasActive ? "Active" : "Inactive",
      loginActive: u.isActive
    };
  });
}

export async function getOwnerUserForAdminEdit(id: string) {
  return prisma.user.findFirst({
    where: { id, userRoles: { some: { role: { code: "owner" } } } },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      ownerProfile: true
    }
  });
}

export async function getTenantUserForAdminEdit(id: string) {
  const selectWithProfile = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    isActive: true,
    tenantProfile: true,
    leasesAsTenant: {
      orderBy: { startDate: "desc" as const },
      take: 25,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        unit: {
          select: {
            unitNumber: true,
            property: { select: { code: true, name: true } }
          }
        }
      }
    }
  } as const;

  try {
    return await prisma.user.findFirst({
      where: { id, userRoles: { some: { role: { code: "tenant" } } } },
      select: selectWithProfile
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2021") {
      throw e;
    }
    const user = await prisma.user.findFirst({
      where: { id, userRoles: { some: { role: { code: "tenant" } } } },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        leasesAsTenant: selectWithProfile.leasesAsTenant
      }
    });
    if (!user) {
      return null;
    }
    return { ...user, tenantProfile: null };
  }
}

export type AdminPropertyPortalRow = {
  id: string;
  code: string;
  name: string;
  formattedAddress: string;
  ownerFinancialAccess: boolean;
  ownerUserId: string | null;
  ownerContractType: string;
  owner: { fullName: string; email: string } | null;
};

export async function listPropertiesForPortalAdmin(): Promise<AdminPropertyPortalRow[]> {
  const rows = await prisma.property.findMany({
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
      country: true,
      ownerFinancialAccess: true,
      ownerUserId: true,
      ownerContractType: true,
      owner: { select: { fullName: true, email: true } }
    }
  });
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    formattedAddress: formatBuildingAddressLine(p),
    ownerFinancialAccess: p.ownerFinancialAccess,
    ownerUserId: p.ownerUserId,
    ownerContractType: p.ownerContractType,
    owner: p.owner
  }));
}

export async function listUnitsForAdmin(propertyId?: string) {
  return prisma.unit.findMany({
    where: propertyId ? { propertyId } : undefined,
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    include: { property: { select: { code: true, name: true } } },
    take: 300
  });
}

export async function listLeasesForAdmin() {
  return prisma.lease.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      startDate: true,
      endDate: true,
      rentAmount: true,
      status: true,
      tenant: { select: { id: true, fullName: true, email: true } },
      unit: {
        select: {
          unitNumber: true,
          property: { select: { code: true, name: true } }
        }
      }
    }
  });
}

export async function listTenantUsersForAdmin() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { code: "tenant" } } }
    },
    orderBy: { fullName: "asc" },
    select: { id: true, email: true, fullName: true, phone: true, isActive: true },
    take: 200
  });
}

/** Admin tenant directory — includes inactive; shows profile type when present. */
export async function listTenantUsersForAdminTable() {
  const base = {
    where: { userRoles: { some: { role: { code: "tenant" } } } },
    orderBy: { fullName: "asc" as const },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      tenantProfile: { select: { tenantType: true, tenantLifecycleStatus: true } }
    },
    take: 300
  };
  try {
    return await prisma.user.findMany(base);
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2021") {
      throw e;
    }
    const rows = await prisma.user.findMany({
      where: base.where,
      orderBy: base.orderBy,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true
      },
      take: base.take
    });
    return rows.map((r) => ({ ...r, tenantProfile: null }));
  }
}

export async function listStaffUsersForAdmin() {
  return prisma.user.findMany({
    where: { userRoles: { some: { role: { code: "staff" } } } },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      staffPermissionGrants: { select: { permissionCode: true } }
    },
    take: 200
  });
}

const leaseAdminEditRelations = {
  tenant: { select: { id: true, fullName: true, email: true } },
  unit: { select: { id: true, property: { select: { id: true, name: true } } } }
} as const;

const leaseAdminEditSelectLegacy = {
  id: true,
  unitId: true,
  tenantUserId: true,
  startDate: true,
  endDate: true,
  rentAmount: true,
  depositAmount: true,
  status: true,
  contractSignedAt: true,
  contractSignerName: true,
  chequeDeliveryState: true,
  chequeAppointmentAt: true,
  chequeAppointmentNotes: true,
  chequeMarkedDeliveredAt: true,
  chequeApprovedAt: true,
  chequeApprovedByUserId: true,
  onboardingCompletedAt: true,
  onboardingCheckinInventory: true,
  createdAt: true,
  ...leaseAdminEditRelations
} as const;

const leaseAdminEditSelectExtended = {
  ...leaseAdminEditSelectLegacy,
  paymentFrequency: true,
  digitalSignatureStatus: true,
  unsignedContractDocumentUrl: true,
  signedContractDocumentUrl: true,
  chequeReceivedAt: true,
  chequeReceivedByUserId: true,
  onboardingContractSigned: true,
  onboardingChequeReceived: true,
  onboardingCheckinCompleted: true
} as const;

export async function getLeaseForAdminEdit(id: string) {
  try {
    return await prisma.lease.findUnique({
      where: { id },
      select: leaseAdminEditSelectExtended
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2022") {
      throw e;
    }
    const row = await prisma.lease.findUnique({
      where: { id },
      select: leaseAdminEditSelectLegacy
    });
    if (!row) {
      return null;
    }
    return {
      ...row,
      paymentFrequency: "monthly",
      digitalSignatureStatus: "none",
      unsignedContractDocumentUrl: null,
      signedContractDocumentUrl: null,
      chequeReceivedAt: null,
      chequeReceivedByUserId: null,
      onboardingContractSigned: Boolean(row.contractSignedAt),
      onboardingChequeReceived: Boolean(row.chequeApprovedAt),
      onboardingCheckinCompleted: Boolean(row.onboardingCompletedAt)
    };
  }
}

export async function getUnitForAdminEdit(id: string) {
  const today = utcTodayDateOnly();
  return prisma.unit.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      property: {
        select: {
          id: true,
          code: true,
          name: true,
          ownerUserId: true,
          owner: { select: { id: true, fullName: true, email: true } }
        }
      },
      leases: {
        where: activeCalendarLeaseWhere(today),
        take: 1,
        select: {
          id: true,
          endDate: true,
          startDate: true,
          status: true,
          tenant: { select: { id: true, fullName: true, email: true } }
        }
      }
    }
  });
}
