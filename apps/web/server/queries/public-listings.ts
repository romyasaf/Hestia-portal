import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activeCalendarLeaseWhere,
  isUnitVisibleOnPublicListings,
  parseStringArrayJson,
  utcTodayDateOnly,
  unitListingDisplayPrice
} from "@/lib/units/public-listing";

export type PublicListingUnit = {
  id: string;
  listingTitle: string;
  listingDescription: string;
  displayPrice: string;
  coverImageUrl: string;
  galleryUrls: string[];
  amenities: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  unitType: string | null;
  propertyCode: string;
  propertyName: string;
  city: string;
};

/**
 * Units shown on the public listings page: no calendar-active lease, listing fields complete.
 * No manual publish flag — visibility is purely derived.
 */
export async function listPublicListingUnits(): Promise<PublicListingUnit[]> {
  try {
    return await listPublicListingUnitsInner();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      return [];
    }
    throw e;
  }
}

async function listPublicListingUnitsInner(): Promise<PublicListingUnit[]> {
  const today = utcTodayDateOnly();
  const leasedUnitIds = await prisma.lease.findMany({
    where: activeCalendarLeaseWhere(today),
    select: { unitId: true }
  });
  const leased = new Set(leasedUnitIds.map((l) => l.unitId));

  const units = await prisma.unit.findMany({
    where: leased.size > 0 ? { id: { notIn: [...leased] } } : undefined,
    include: {
      property: { select: { code: true, name: true, city: true } }
    },
    orderBy: [{ property: { code: "asc" } }, { unitNumber: "asc" }],
    take: 200
  });

  const out: PublicListingUnit[] = [];
  for (const u of units) {
    if (!isUnitVisibleOnPublicListings(u, false)) {
      continue;
    }
    const price = unitListingDisplayPrice(u);
    if (!price) {
      continue;
    }
    const title = u.listingTitle?.trim();
    const desc = u.listingDescription?.trim();
    const cover = u.listingCoverImageUrl?.trim();
    if (!title || !desc || !cover) {
      continue;
    }
    out.push({
      id: u.id,
      listingTitle: title,
      listingDescription: desc,
      displayPrice: price.toString(),
      coverImageUrl: cover,
      galleryUrls: parseStringArrayJson(u.listingGalleryUrls),
      amenities: parseStringArrayJson(u.listingAmenities),
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      unitType: u.unitType,
      propertyCode: u.property.code,
      propertyName: u.property.name,
      city: u.property.city
    });
  }
  return out;
}

