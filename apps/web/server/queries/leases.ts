import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { prisma } from "@/lib/prisma";

/** Calendar "today" in UTC for stable comparison with `@db.Date` columns. */
export function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type ActiveLeaseForTenant = {
  leaseId: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  unit: {
    id: string;
    unitNumber: string;
    unitType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
  };
  /** Building = `properties` row linked through the unit. */
  building: {
    id: string;
    code: string;
    name: string;
    addressLine1: string;
    city: string;
    country: string;
  };
  contractSignedAt: string | null;
  contractSignerName: string | null;
  chequeDeliveryState: string;
  chequeAppointmentAt: string | null;
  chequeAppointmentNotes: string | null;
  chequeMarkedDeliveredAt: string | null;
  chequeApprovedAt: string | null;
  onboardingCompletedAt: string | null;
};

function decimalToString(value: { toString(): string } | null | undefined): string {
  if (value == null) {
    return "0";
  }
  return value.toString();
}

type LeaseWithUnitProp = {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  rentAmount: { toString(): string };
  depositAmount: { toString(): string } | null;
  contractSignedAt: Date | null;
  contractSignerName: string | null;
  chequeDeliveryState: string;
  chequeAppointmentAt: Date | null;
  chequeAppointmentNotes: string | null;
  chequeMarkedDeliveredAt: Date | null;
  chequeApprovedAt: Date | null;
  onboardingCompletedAt: Date | null;
  unit: {
    id: string;
    unitNumber: string;
    unitType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    property: {
      id: string;
      code: string;
      name: string;
      addressLine1: string;
      city: string;
      country: string;
    };
  };
};

function mapLeaseRow(row: LeaseWithUnitProp): ActiveLeaseForTenant {
  const { unit } = row;
  const building = unit.property;
  return {
    leaseId: row.id,
    status: row.status,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    rentAmount: decimalToString(row.rentAmount),
    depositAmount: decimalToString(row.depositAmount),
    unit: {
      id: unit.id,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms
    },
    building: {
      id: building.id,
      code: building.code,
      name: building.name,
      addressLine1: building.addressLine1,
      city: building.city,
      country: building.country
    },
    contractSignedAt: row.contractSignedAt?.toISOString() ?? null,
    contractSignerName: row.contractSignerName,
    chequeDeliveryState: row.chequeDeliveryState.trim().toLowerCase(),
    chequeAppointmentAt: row.chequeAppointmentAt?.toISOString() ?? null,
    chequeAppointmentNotes: row.chequeAppointmentNotes,
    chequeMarkedDeliveredAt: row.chequeMarkedDeliveredAt?.toISOString() ?? null,
    chequeApprovedAt: row.chequeApprovedAt?.toISOString() ?? null,
    onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null
  };
}

const leaseOnboardingSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  rentAmount: true,
  depositAmount: true,
  contractSignedAt: true,
  contractSignerName: true,
  chequeDeliveryState: true,
  chequeAppointmentAt: true,
  chequeAppointmentNotes: true,
  chequeMarkedDeliveredAt: true,
  chequeApprovedAt: true,
  onboardingCompletedAt: true,
  unit: {
    select: {
      id: true,
      unitNumber: true,
      unitType: true,
      bedrooms: true,
      bathrooms: true,
      property: {
        select: {
          id: true,
          code: true,
          name: true,
          addressLine1: true,
          city: true,
          country: true
        }
      }
    }
  }
} as const;

/**
 * Calendar-active lease: status **active** (case-insensitive) and today (UTC) in `[startDate, endDate]`.
 * Onboarding fields describe move-in workflow; full portal operations require `onboardingCompletedAt`.
 */
export async function getActiveLeaseForTenant(userId: string): Promise<ActiveLeaseForTenant | null> {
  const today = utcTodayDateOnly();

  const row = await prisma.lease.findFirst({
    where: {
      tenantUserId: userId,
      status: leaseStatusActiveWhere(),
      startDate: { lte: today },
      endDate: { gte: today }
    },
    orderBy: { startDate: "desc" },
    select: leaseOnboardingSelect
  });

  if (!row) {
    return null;
  }

  return mapLeaseRow(row as unknown as LeaseWithUnitProp);
}

/** Active lease with tenant onboarding fully finished (contract, cheques approved, check-in submitted). */
export async function getOperationalLeaseForTenant(userId: string): Promise<ActiveLeaseForTenant | null> {
  const lease = await getActiveLeaseForTenant(userId);
  if (!lease?.onboardingCompletedAt) {
    return null;
  }
  return lease;
}

export type PastLeaseRow = {
  leaseId: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  unitNumber: string;
  propertyName: string;
  propertyCode: string;
};

/** Leases that are not calendar-active today (history / expired). */
export async function listPastLeasesForTenant(userId: string, take = 25): Promise<PastLeaseRow[]> {
  const today = utcTodayDateOnly();
  const rows = await prisma.lease.findMany({
    where: {
      tenantUserId: userId,
      NOT: {
        AND: [
          { status: leaseStatusActiveWhere() },
          { startDate: { lte: today } },
          { endDate: { gte: today } }
        ]
      }
    },
    orderBy: { endDate: "desc" },
    take,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      rentAmount: true,
      unit: { select: { unitNumber: true, property: { select: { name: true, code: true } } } }
    }
  });

  return rows.map((r) => ({
    leaseId: r.id,
    status: r.status,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    rentAmount: decimalToString(r.rentAmount),
    unitNumber: r.unit.unitNumber,
    propertyName: r.unit.property.name,
    propertyCode: r.unit.property.code
  }));
}
