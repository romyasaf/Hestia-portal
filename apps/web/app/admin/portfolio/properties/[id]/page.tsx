import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyOwnerFinancialToggle } from "@/components/admin/property-owner-financial-toggle";
import { getPortfolioPropertyDetail } from "@/server/queries/admin-portfolio";

type Props = { params: { id: string } };

export default async function PortfolioPropertyDetailPage({ params }: Props) {
  const detail = await getPortfolioPropertyDetail(params.id);
  if (!detail) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/20 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/portfolio?tab=buildings" className="font-medium text-primary hover:underline">
            ← Portfolio · Buildings
          </Link>
        </p>
        <header className="mt-6 border-b border-border/80 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Building</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {detail.code} · {detail.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{detail.formattedAddress}</p>
          <p className="mt-2">
            <Link
              href={`/admin/properties/${detail.id}/edit`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Edit building & address
            </Link>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-border/80 bg-card/70 px-5 py-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Building-level owner</p>
              <p className="mt-1 text-sm text-foreground">
                {detail.owner ? (
                  <>
                    {detail.owner.fullName}
                    <br />
                    <span className="text-muted-foreground">{detail.owner.email}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </p>
            </div>
            <div className="border-l border-border pl-6">
              <p className="text-xs font-medium text-muted-foreground">Owner portal financials</p>
              <div className="mt-2">
                <PropertyOwnerFinancialToggle propertyId={detail.id} initial={detail.ownerFinancialAccess} />
              </div>
            </div>
          </div>
        </header>

        <section className="py-10">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Units & occupancy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Links open the portfolio unit summary. Active lease reflects calendar-active status today (UTC).
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Direct owner</th>
                  <th className="px-4 py-3 font-medium">Resolved owner</th>
                  <th className="px-4 py-3 font-medium">Inventory</th>
                  <th className="px-4 py-3 font-medium">Occupancy</th>
                  <th className="px-4 py-3 font-medium">Active lease</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {detail.units.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No units on this building yet.
                    </td>
                  </tr>
                ) : (
                  detail.units.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/25">
                      <td className="px-4 py-3 font-medium text-foreground">{u.unitNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.directUnitOwner ? (
                          <>
                            {u.directUnitOwner.fullName}
                            <br />
                            <span>{u.directUnitOwner.email}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-xs text-muted-foreground">
                        <span className="text-foreground">{u.resolvedOwnerLabel}</span>
                        <p className="mt-1">
                          {u.resolvedOwnerSource === "unit"
                            ? "Unit-level"
                            : u.resolvedOwnerSource === "building"
                              ? "Building-level"
                              : "Unassigned"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.occupancy === "occupied" ? "Occupied" : "Vacant"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.activeLease ? (
                          <>
                            {u.activeLease.tenantName}
                            <br />
                            {u.activeLease.startDate} → {u.activeLease.endDate} · {u.activeLease.rentAmount}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
                          <Link href={`/admin/portfolio/units/${u.id}`} className="font-medium text-primary hover:underline">
                            View
                          </Link>
                          <Link href={`/admin/units/${u.id}?section=overview`} className="font-medium text-primary/90 hover:underline">
                            Edit
                          </Link>
                          {u.activeLease ? (
                            <Link href={`/admin/leases/${u.activeLease.id}`} className="font-medium text-primary hover:underline">
                              Lease
                            </Link>
                          ) : null}
                          {u.activeLease ? (
                            <Link href={`/admin/tenants/${u.activeLease.tenantId}`} className="font-medium text-primary hover:underline">
                              Tenant
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={`/admin/portfolio?tab=units&property=${detail.id}`} className="font-medium text-primary hover:underline">
            Open this building in Units tab →
          </Link>
        </p>
      </div>
    </div>
  );
}
