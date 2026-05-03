import { formatBuildingAddressLine } from "@/lib/portfolio/building-address";
import { formatResolvedOwnerLine, resolveUnitOwner } from "@/lib/portfolio/ownership";
import { formatFinanceMoney } from "@/lib/finance/format-money";
import { loadMergedCheckinTemplateForUnit } from "@/server/queries/checkin-inventory-merge";
import { parseStringArrayJson, unitListingDisplayPrice } from "@/lib/units/public-listing";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type PortfolioUnitSystemDetail = Awaited<ReturnType<typeof getPortfolioUnitSystemDetail>>;

export type PortfolioUnitSystemResult = NonNullable<PortfolioUnitSystemDetail>;

/**
 * Admin portfolio unit view: full operational state — listing, inventory, lease history,
 * maintenance, check-in / check-out, finance.
 */
export async function getPortfolioUnitSystemDetail(unitId: string) {
  const today = utcTodayDateOnly();
  const u = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      unitNumber: true,
      status: true,
      unitType: true,
      floor: true,
      areaSqm: true,
      furnishingStatus: true,
      bedrooms: true,
      bathrooms: true,
      monthlyRent: true,
      listingTitle: true,
      listingDescription: true,
      listingMonthlyPrice: true,
      listingCoverImageUrl: true,
      listingGalleryUrls: true,
      listingAmenities: true,
      listingNotes: true,
      listingAvailabilityDate: true,
      checkinInventoryTemplate: true,
      ownerUserId: true,
      owner: { select: { id: true, fullName: true, email: true } },
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
          country: true,
          ownerUserId: true,
          owner: { select: { id: true, fullName: true, email: true } }
        }
      },
      leases: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
          depositAmount: true,
          tenant: { select: { id: true, fullName: true, email: true, phone: true } },
          checkIns: {
            orderBy: { submittedAt: "desc" },
            take: 20,
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
              tenantNotes: true,
              issues: { select: { id: true, summary: true, createdAt: true } }
            }
          },
          checkouts: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              preferredMoveOutDate: true,
              scheduledAt: true,
              adminNotes: true,
              inspectionOutcome: true,
              inspectionNotes: true,
              damagesSummary: true,
              finalDecisionNotes: true,
              completedAt: true,
              createdAt: true
            }
          }
        }
      }
    }
  });
  if (!u) {
    return null;
  }

  const [tickets, inventoryItems, rentAgg, expAgg, receiptList] = await Promise.all([
    prisma.ticket.findMany({
      where: { unitId: u.id },
      orderBy: { openedAt: "desc" },
      take: 100,
      select: {
        id: true,
        ticketNo: true,
        status: true,
        priority: true,
        title: true,
        openedAt: true,
        closedAt: true,
        leaseId: true,
        lease: { select: { tenant: { select: { fullName: true } } } }
      }
    }),
    prisma.unitInventoryItem.findMany({
      where: { unitId: u.id },
      orderBy: [{ category: "asc" }, { itemName: "asc" }]
    }),
    prisma.receipt.aggregate({
      where: { lease: { unitId: u.id } },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { unitId: u.id },
      _sum: { amount: true }
    }),
    prisma.receipt.findMany({
      where: { lease: { unitId: u.id } },
      take: 24,
      orderBy: { receivedAt: "desc" },
      select: { id: true, amount: true, receivedAt: true, category: true, lease: { select: { id: true } } }
    })
  ]);

  const resolved = resolveUnitOwner({
    unitOwnerUserId: u.ownerUserId,
    unitOwner: u.owner ? { fullName: u.owner.fullName, email: u.owner.email } : null,
    buildingOwnerUserId: u.property.ownerUserId,
    buildingOwner: u.property.owner
      ? { fullName: u.property.owner.fullName, email: u.property.owner.email }
      : null
  });

  const activeLease = u.leases.find((l) => {
    const s = l.status.toLowerCase();
    if (s !== "active") {
      return false;
    }
    return l.startDate <= today && l.endDate >= today;
  });
  const price = unitListingDisplayPrice(u);
  const displayPriceLabel =
    price == null || Number(price) <= 0 ? "—" : formatFinanceMoney(Number(price));
  const monthlyRentLabel =
    u.monthlyRent == null || Number(u.monthlyRent) <= 0 ? "—" : formatFinanceMoney(Number(u.monthlyRent));

  const merged = await loadMergedCheckinTemplateForUnit(u.checkinInventoryTemplate);
  const checkinTemplateLines = merged.map((line) => ({
    id: line.id,
    label: line.label,
    defaultCondition: line.defaultCondition,
    notes: line.notes,
    source: line.id.startsWith("master-") ? ("master" as const) : ("unit" as const)
  }));

  const openTickets = tickets.filter((t) => t.status && !/closed|resolved|complete/i.test(t.status));
  const totalRentIn = Number(rentAgg._sum.amount ?? 0);
  const totalExp = Number(expAgg._sum.amount ?? 0);
  const net = totalRentIn - totalExp;

  return {
    id: u.id,
    unitNumber: u.unitNumber,
    unitStatus: u.status,
    unitType: u.unitType,
    floor: u.floor,
    areaSqm: u.areaSqm,
    furnishingStatus: u.furnishingStatus,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    monthlyRentLabel,
    listingAvailabilityDate: u.listingAvailabilityDate?.toISOString().slice(0, 10) ?? null,
    property: {
      id: u.property.id,
      code: u.property.code,
      name: u.property.name,
      formattedAddress: formatBuildingAddressLine(u.property),
      buildingOwner: u.property.owner
    },
    directUnitOwner: u.owner,
    resolvedOwnerLabel: formatResolvedOwnerLine(resolved),
    resolvedOwnerSource: resolved.source ?? "none",
    occupancy: activeLease ? ("occupied" as const) : ("vacant" as const),
    activeLease: activeLease
      ? {
          id: activeLease.id,
          status: activeLease.status,
          startDate: activeLease.startDate.toISOString().slice(0, 10),
          endDate: activeLease.endDate.toISOString().slice(0, 10),
          rentAmount: activeLease.rentAmount.toString(),
          depositAmount: activeLease.depositAmount.toString(),
          tenant: activeLease.tenant
        }
      : null,
    leaseHistory: u.leases.map((l) => ({
      id: l.id,
      status: l.status,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      rentAmount: l.rentAmount.toString(),
      tenant: l.tenant,
      isCalendarActive: l.startDate <= today && l.endDate >= today && l.status.toLowerCase() === "active"
    })),
    listing: {
      title: u.listingTitle?.trim() || null,
      description: u.listingDescription?.trim() || null,
      notes: u.listingNotes?.trim() || null,
      displayPriceLabel,
      coverImageUrl: u.listingCoverImageUrl?.trim() || null,
      galleryUrls: parseStringArrayJson(u.listingGalleryUrls as Prisma.JsonValue),
      amenities: parseStringArrayJson(u.listingAmenities as Prisma.JsonValue)
    },
    checkinTemplateLines,
    inventoryItems: inventoryItems.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      category: i.category,
      quantity: i.quantity.toString(),
      conditionLabel: i.conditionLabel,
      notes: i.notes,
      photoUrl: i.photoUrl
    })),
    maintenance: {
      open: openTickets,
      all: tickets
    },
    checkInCheckOut: {
      checkIns: u.leases.flatMap((l) =>
        l.checkIns.map((c) => ({
          id: c.id,
          leaseId: l.id,
          status: c.status,
          submittedAt: c.submittedAt.toISOString(),
          reviewedAt: c.reviewedAt?.toISOString() ?? null,
          tenant: l.tenant,
          issueCount: c.issues.length
        }))
      ),
      checkOuts: u.leases.flatMap((l) =>
        l.checkouts.map((c) => ({
          id: c.id,
          leaseId: l.id,
          status: c.status,
          scheduledAt: c.scheduledAt?.toISOString() ?? null,
          completedAt: c.completedAt?.toISOString() ?? null,
          inspectionNotes: c.inspectionNotes,
          finalDecisionNotes: c.finalDecisionNotes,
          inspectionOutcome: c.inspectionOutcome,
          damagesSummary: c.damagesSummary,
          tenant: l.tenant
        }))
      )
    },
    finance: {
      totalRentReceipts: formatFinanceMoney(totalRentIn),
      totalUnitExpenses: formatFinanceMoney(totalExp),
      net: formatFinanceMoney(net),
      recentReceipts: receiptList.map((r) => ({
        id: r.id,
        amount: r.amount.toString(),
        receivedAt: r.receivedAt.toISOString(),
        category: r.category,
        leaseId: r.lease?.id ?? null
      }))
    }
  };
}
