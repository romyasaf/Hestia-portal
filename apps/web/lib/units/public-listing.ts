import type { Prisma } from "@prisma/client";
import { leaseStatusActiveWhere } from "@/lib/leases/status";

export function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Calendar-active lease filter (same rule as portfolio / finance). */
export function activeCalendarLeaseWhere(today: Date) {
  return {
    status: leaseStatusActiveWhere(),
    startDate: { lte: today },
    endDate: { gte: today }
  };
}

export function parseStringArrayJson(value: Prisma.JsonValue | null | undefined): string[] {
  if (value == null || !Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
}

export function unitListingDisplayPrice(unit: {
  listingMonthlyPrice: Prisma.Decimal | null | undefined;
  monthlyRent: Prisma.Decimal | null | undefined;
}): Prisma.Decimal | null {
  return unit.listingMonthlyPrice ?? unit.monthlyRent ?? null;
}

export function isUnitListingComplete(unit: {
  listingTitle: string | null | undefined;
  listingDescription: string | null | undefined;
  listingCoverImageUrl: string | null | undefined;
  listingMonthlyPrice: Prisma.Decimal | null | undefined;
  monthlyRent: Prisma.Decimal | null | undefined;
  listingGalleryUrls?: Prisma.JsonValue | null | undefined;
}): boolean {
  const title = unit.listingTitle?.trim();
  const description = unit.listingDescription?.trim();
  const cover = unit.listingCoverImageUrl?.trim();
  const price = unitListingDisplayPrice(unit);
  if (!title || !description || !cover || price == null) {
    return false;
  }
  return Number(price) > 0;
}

/**
 * Public /listings: show only when there is no calendar-active tenant lease and listing data is complete.
 * Call with `hasActiveCalendarLease` from a lease query (same day UTC window as portfolio).
 */
export function isUnitVisibleOnPublicListings(
  unit: Parameters<typeof isUnitListingComplete>[0],
  hasActiveCalendarLease: boolean
): boolean {
  if (hasActiveCalendarLease) {
    return false;
  }
  return isUnitListingComplete(unit);
}
