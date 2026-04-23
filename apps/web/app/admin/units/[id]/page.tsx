import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUnitForm } from "@/components/admin/admin-unit-form";
import { AdminUnitListingForm } from "@/components/admin/admin-unit-listing-form";
import {
  AdminUnitSectionNav,
  parseAdminUnitSection,
  type AdminUnitSection
} from "@/components/admin/admin-unit-section-nav";
import { AdminUnitVisibilityPanel } from "@/components/admin/admin-unit-visibility-panel";
import { parseStringArrayJson } from "@/lib/units/public-listing";
import { getUnitForAdminEdit, listBuildingsForUnitForm, listOwnerUsersForSelect } from "@/server/queries/admin-entities";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminEditUnitPage({ params, searchParams }: Props) {
  const unit = await getUnitForAdminEdit(params.id);
  if (!unit) {
    notFound();
  }

  const [properties, owners] = await Promise.all([listBuildingsForUnitForm(), listOwnerUsersForSelect()]);
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
        <Link href="/admin/units" className="text-primary hover:underline">
          ← Units
        </Link>
        {" · "}
        <Link href="/admin/portfolio?tab=units" className="text-primary hover:underline">
          Portfolio
        </Link>
      </p>
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {unit.property.code} · {unit.property.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Unit {unit.unitNumber}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Operational data, marketing listing, and public visibility.</p>
      </header>

      <AdminUnitSectionNav unitId={unit.id} section={section} />

      {section === "overview" ? (
        <AdminUnitForm
          unitId={unit.id}
          properties={opts}
          ownerOptions={ownerOpts}
          initial={{
            propertyId: unit.propertyId,
            unitNumber: unit.unitNumber,
            unitType: unit.unitType ?? "",
            bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : "",
            bathrooms: unit.bathrooms != null ? String(unit.bathrooms) : "",
            monthlyRent: unit.monthlyRent != null ? unit.monthlyRent.toString() : "",
            status: unit.status,
            unitOwnerUserId: unit.ownerUserId ?? ""
          }}
        />
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
            listingAmenitiesRaw: parseStringArrayJson(unit.listingAmenities).join("\n")
          }}
        />
      ) : null}

      {section === "visibility" ? (
        <AdminUnitVisibilityPanel
          unit={{
            listingTitle: unit.listingTitle,
            listingDescription: unit.listingDescription,
            listingCoverImageUrl: unit.listingCoverImageUrl,
            listingMonthlyPrice: unit.listingMonthlyPrice,
            monthlyRent: unit.monthlyRent,
            activeLease: activeLeaseSummary
          }}
        />
      ) : null}
    </div>
  );
}
