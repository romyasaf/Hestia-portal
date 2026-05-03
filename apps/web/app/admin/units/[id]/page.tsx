import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUnitForm } from "@/components/admin/admin-unit-form";
import { AdminUnitListingForm } from "@/components/admin/admin-unit-listing-form";
import {
  AdminUnitSectionNav,
  parseAdminUnitSection,
  type AdminUnitSection
} from "@/components/admin/admin-unit-section-nav";
import { AdminUnitCheckinInventoryForm } from "@/components/admin/admin-unit-checkin-inventory-form";
import { AdminUnitInventoryPanel } from "@/components/admin/admin-unit-inventory-panel";
import { AdminUnitVisibilityPanel } from "@/components/admin/admin-unit-visibility-panel";
import { normalizeTemplateFromJson } from "@/lib/tenant-lifecycle/inventory-template";
import { parseStringArrayJson } from "@/lib/units/public-listing";
import { getUnitForAdminEdit, listBuildingsForUnitForm, listOwnerUsersForSelect } from "@/server/queries/admin-entities";
import { listUnitInventoryItemsForAdmin } from "@/server/queries/unit-inventory";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminEditUnitPage({ params, searchParams }: Props) {
  const unit = await getUnitForAdminEdit(params.id);
  if (!unit) {
    notFound();
  }

  const [properties, owners, inventoryItems] = await Promise.all([
    listBuildingsForUnitForm(),
    listOwnerUsersForSelect(),
    listUnitInventoryItemsForAdmin(unit.id)
  ]);
  const opts = properties.map((p) => ({
    id: p.id,
    label: p.owner
      ? `${p.code} · ${p.name} · Building owner: ${p.owner.fullName}`
      : `${p.code} · ${p.name} · No building-level owner`
  }));
  const ownerOpts = owners.map((u) => ({ id: u.id, label: `${u.fullName} (${u.email})` }));
  const section: AdminUnitSection = parseAdminUnitSection(searchParams.section);
  const activeLease = unit.leases[0];
  const activeLeaseSummary = activeLease
    ? {
        id: activeLease.id,
        endDate: activeLease.endDate.toISOString().slice(0, 10),
        tenantName: activeLease.tenant.fullName
      }
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <p className="text-sm">
        <Link href={`/admin/portfolio/units/${unit.id}`} className="text-primary hover:underline">
          ← Portfolio unit view
        </Link>
        {" · "}
        <Link href="/admin/units" className="text-primary hover:underline">
          All units
        </Link>
        {" · "}
        <Link href="/admin/portfolio?tab=units" className="text-primary hover:underline">
          Portfolio grid
        </Link>
      </p>
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {unit.property.code} · {unit.property.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Unit {unit.unitNumber}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the sections below: <strong className="font-medium text-foreground">Overview</strong> (operations),{" "}
          <strong className="font-medium text-foreground">Listing</strong> (marketing + uploads),{" "}
          <strong className="font-medium text-foreground">Inventory</strong> (check-in template, not public),{" "}
          <strong className="font-medium text-foreground">Visibility</strong>.{" "}
          <Link href={`/admin/portfolio/units/${unit.id}`} className="font-medium text-primary hover:underline">
            Portfolio summary
          </Link>
        </p>
      </header>

      <AdminUnitSectionNav unitId={unit.id} section={section} />

      {section === "overview" ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Overview</span> — building, unit number, beds/baths, rent,
              optional direct owner, and manual status until lease-derived occupancy is enabled in a later phase.
            </p>
          </div>
          <AdminUnitForm
            unitId={unit.id}
            properties={opts}
            ownerOptions={ownerOpts}
            initial={{
              propertyId: unit.propertyId,
              unitNumber: unit.unitNumber,
              unitType: unit.unitType ?? "",
              floor: unit.floor ?? "",
              areaSqm: unit.areaSqm != null ? unit.areaSqm.toString() : "",
              furnishingStatus: unit.furnishingStatus ?? "",
              bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : "",
              bathrooms: unit.bathrooms != null ? String(unit.bathrooms) : "",
              monthlyRent: unit.monthlyRent != null ? unit.monthlyRent.toString() : "",
              status: unit.status,
              unitOwnerUserId: unit.ownerUserId ?? ""
            }}
          />
        </div>
      ) : null}

      {section === "listing" ? (
        <AdminUnitListingForm
          unitId={unit.id}
          initial={{
            listingTitle: unit.listingTitle?.trim() ?? "",
            listingDescription: unit.listingDescription?.trim() ?? "",
            listingMonthlyPrice: unit.listingMonthlyPrice != null ? unit.listingMonthlyPrice.toString() : "",
            listingCoverImageUrl: unit.listingCoverImageUrl?.trim() ?? "",
            listingGalleryUrlsRaw: parseStringArrayJson(unit.listingGalleryUrls).join("\n"),
            listingAmenitiesRaw: parseStringArrayJson(unit.listingAmenities).join("\n"),
            listingNotes: unit.listingNotes?.trim() ?? "",
            listingAvailabilityDate: unit.listingAvailabilityDate
              ? unit.listingAvailabilityDate.toISOString().slice(0, 10)
              : ""
          }}
        />
      ) : null}

      {section === "checkin" ? (
        <div className="space-y-8">
          <AdminUnitInventoryPanel unitId={unit.id} items={inventoryItems} />
          <div>
            <h2 className="text-base font-semibold tracking-tight">Legacy JSON checklist (onboarding seed)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Still merged into lease move-in onboarding. Prefer structured inventory above for new work.
            </p>
            <div className="mt-4">
              <AdminUnitCheckinInventoryForm
                unitId={unit.id}
                initialLines={normalizeTemplateFromJson(unit.checkinInventoryTemplate)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {section === "visibility" ? (
        <AdminUnitVisibilityPanel
          unit={{
            listingTitle: unit.listingTitle,
            listingDescription: unit.listingDescription,
            listingCoverImageUrl: unit.listingCoverImageUrl,
            listingMonthlyPrice: unit.listingMonthlyPrice,
            monthlyRent: unit.monthlyRent,
            listingGalleryUrls: unit.listingGalleryUrls,
            activeLease: activeLeaseSummary
          }}
        />
      ) : null}
    </div>
  );
}
