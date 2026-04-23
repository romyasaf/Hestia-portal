import Link from "next/link";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";

export default async function TenantMyUnitPage() {
  const { lease } = await requireTenantOperationalLease();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My unit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unit tied to your operational (move-in complete) lease.</p>
      </header>

      <dl className="space-y-4 rounded-xl border border-border bg-card p-6 text-sm shadow-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit number</dt>
            <dd className="mt-1 text-lg font-semibold">{lease.unit.unitNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Building</dt>
            <dd className="mt-1">{lease.building.name}</dd>
            <dd className="mt-1 text-muted-foreground">{lease.building.addressLine1}</dd>
            <dd className="mt-1 text-muted-foreground">
              {lease.building.city}, {lease.building.country}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit type</dt>
            <dd className="mt-1">{lease.unit.unitType ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bedrooms</dt>
              <dd className="mt-1">{lease.unit.bedrooms ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bathrooms</dt>
              <dd className="mt-1">{lease.unit.bathrooms ?? "—"}</dd>
            </div>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            Maintenance for this unit:{" "}
            <Link href="/tenant/maintenance" className="text-primary hover:underline">
              Maintenance
            </Link>
            .
          </p>
        </dl>
    </div>
  );
}
