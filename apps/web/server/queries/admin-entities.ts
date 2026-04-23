import { resolveUnitOwner, formatResolvedOwnerLine } from "@/lib/portfolio/ownership";
import { activeCalendarLeaseWhere, utcTodayDateOnly } from "@/lib/units/public-listing";
import { prisma } from "@/lib/prisma";

export async function listPropertiesForSelect() {
  return prisma.property.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true }
  });
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

export async function listPropertiesForPortalAdmin() {
  return prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      ownerFinancialAccess: true,
      ownerUserId: true,
      ownerContractType: true,
      owner: { select: { fullName: true, email: true } }
    }
  });
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
    include: {
      tenant: { select: { id: true, fullName: true, email: true } },
      unit: {
        include: { property: { select: { code: true, name: true } } }
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

export async function getLeaseForAdminEdit(id: string) {
  return prisma.lease.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, fullName: true, email: true } },
      unit: { include: { property: { select: { id: true, name: true } } } }
    }
  });
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
