import Link from "next/link";
import { PropertyOwnerAssign } from "@/components/admin/property-owner-assign";
import { PropertyOwnerContractSelect } from "@/components/admin/property-owner-contract-select";
import { PropertyOwnerFinancialToggle } from "@/components/admin/property-owner-financial-toggle";
import { listOwnerUsersForSelect, listPropertiesForPortalAdmin } from "@/server/queries/admin-entities";

export default async function AdminPropertiesPortalPage() {
  const [rows, owners] = await Promise.all([listPropertiesForPortalAdmin(), listOwnerUsersForSelect()]);
  const ownerOptions = owners.map((u) => ({ id: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/portfolio?tab=buildings" className="font-medium text-primary hover:underline">
              Portfolio · Buildings
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Buildings & owner portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set an optional building-level owner, enable owner portal financials when needed, and use units to assign
            per-unit owners where deals require it.
          </p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New building
        </Link>
      </header>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((p) => (
          <li
            key={`${p.id}-${p.ownerFinancialAccess}`}
            className="flex flex-col gap-4 px-4 py-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {p.code} · {p.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{p.formattedAddress}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <Link href={`/admin/properties/${p.id}/edit`} className="font-medium text-primary hover:underline">
                  Edit building & address
                </Link>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Building-level owner:{" "}
                {p.owner ? (
                  <>
                    {p.owner.fullName} ({p.owner.email})
                  </>
                ) : (
                  "— none —"
                )}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <PropertyOwnerAssign
                propertyId={p.id}
                currentOwnerUserId={p.ownerUserId}
                ownerOptions={ownerOptions}
              />
              <div className="text-right">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Owner contract</p>
                <PropertyOwnerContractSelect
                  propertyId={p.id}
                  ownerUserId={p.ownerUserId}
                  ownerContractType={p.ownerContractType}
                />
              </div>
              <PropertyOwnerFinancialToggle propertyId={p.id} initial={p.ownerFinancialAccess} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
