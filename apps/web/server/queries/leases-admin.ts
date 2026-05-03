import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { prisma } from "@/lib/prisma";

/** Calendar "today" in UTC for stable comparison with `@db.Date` columns. */
function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Active lease row for admin pickers (same date/status rules as tenant active lease). */
export type AdminActiveLeaseOption = {
  leaseId: string;
  tenantUserId: string;
  tenantName: string;
  tenantEmail: string;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
};

export async function listActiveLeasesForAdminSelect(): Promise<AdminActiveLeaseOption[]> {
  const today = utcTodayDateOnly();

  const rows = await prisma.lease.findMany({
    where: {
      status: leaseStatusActiveWhere(),
      startDate: { lte: today },
      endDate: { gte: today }
    },
    orderBy: [{ unit: { property: { name: "asc" } } }, { unit: { unitNumber: "asc" } }],
    select: {
      id: true,
      tenantUserId: true,
      startDate: true,
      endDate: true,
      tenant: { select: { id: true, fullName: true, email: true } },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          property: { select: { id: true, code: true, name: true } }
        }
      }
    },
    take: 200
  });

  return rows.map((row) => {
    const u = row.unit;
    const p = u.property;
    return {
      leaseId: row.id,
      tenantUserId: row.tenantUserId,
      tenantName: row.tenant.fullName,
      tenantEmail: row.tenant.email,
      propertyId: p.id,
      propertyCode: p.code,
      propertyName: p.name,
      unitId: u.id,
      unitNumber: u.unitNumber,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10)
    };
  });
}

export type ResolvedActiveLeaseForAdmin =
  | {
      ok: true;
      leaseId: string;
      tenantUserId: string;
      propertyId: string;
      unitId: string;
    }
  | { ok: false; error: "not_found" | "not_active" };

/**
 * Validates `leaseId` refers to a calendar-active lease (status + dates).
 * Used when admins create maintenance tickets for a chosen lease.
 */
export async function resolveActiveLeaseForAdminById(leaseId: string): Promise<ResolvedActiveLeaseForAdmin> {
  const today = utcTodayDateOnly();

  const row = await prisma.lease.findFirst({
    where: {
      id: leaseId,
      status: leaseStatusActiveWhere(),
      startDate: { lte: today },
      endDate: { gte: today }
    },
    select: {
      id: true,
      tenantUserId: true,
      unitId: true,
      unit: { select: { propertyId: true } }
    }
  });

  if (!row) {
    const exists = await prisma.lease.findUnique({ where: { id: leaseId }, select: { id: true } });
    return exists ? { ok: false, error: "not_active" } : { ok: false, error: "not_found" };
  }

  return {
    ok: true,
    leaseId: row.id,
    tenantUserId: row.tenantUserId,
    propertyId: row.unit.propertyId,
    unitId: row.unitId
  };
}
