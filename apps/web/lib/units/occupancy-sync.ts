import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { activeCalendarLeaseWhere, utcTodayDateOnly } from "@/lib/units/public-listing";
import { prisma } from "@/lib/prisma";

/** True if another lease on the same unit is `active` (case-insensitive) and overlaps [start, end]. */
export async function findOverlappingActiveLeaseOnUnit(input: {
  unitId: string;
  startDate: Date;
  endDate: Date;
  excludeLeaseId?: string;
}) {
  return prisma.lease.findFirst({
    where: {
      unitId: input.unitId,
      status: leaseStatusActiveWhere(),
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
      ...(input.excludeLeaseId ? { NOT: { id: input.excludeLeaseId } } : {})
    },
    select: { id: true }
  });
}

/** Sets `Unit.status` to `occupied` or `available` from calendar-active tenant lease (today). */
export async function syncUnitOccupancyFromLeases(unitId: string): Promise<void> {
  const today = utcTodayDateOnly();
  const active = await prisma.lease.findFirst({
    where: {
      unitId,
      ...activeCalendarLeaseWhere(today)
    },
    select: { id: true }
  });
  await prisma.unit.update({
    where: { id: unitId },
    data: { status: active ? "occupied" : "available" }
  });
}
