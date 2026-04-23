import Link from "next/link";
import type { ReactNode } from "react";
import { PropertyOwnerFinancialToggle } from "@/components/admin/property-owner-financial-toggle";
import { CANONICAL_LEASE_STATUSES } from "@/lib/leases/status";
import { cn } from "@/lib/utils";
import type {
  AdminPortfolioSnapshot,
  PortfolioExpiringLease,
  PortfolioLeaseRow,
  PortfolioOwnerRow,
  PortfolioPropertyRow,
  PortfolioRecentLease,
  PortfolioTab,
  PortfolioTenantRow,
  PortfolioUnitOccupancy,
  PortfolioUnitRow,
  PortfolioVacantUnit
} from "@/server/queries/admin-portfolio";

type PropertyOpt = { id: string; code: string; name: string };

export type PortfolioWorkspaceData = {
  snapshot: AdminPortfolioSnapshot;
  recentLeases: PortfolioRecentLease[];
  vacantUnits: PortfolioVacantUnit[];
  expiringLeases: PortfolioExpiringLease[];
  propertyRows: PortfolioPropertyRow[];
  unitRows: PortfolioUnitRow[];
  ownerRows: PortfolioOwnerRow[];
  tenantRows: PortfolioTenantRow[];
  leaseRows: PortfolioLeaseRow[];
  propertyOptions: PropertyOpt[];
};

const TABS: { id: PortfolioTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "buildings", label: "Buildings" },
  { id: "units", label: "Units" },
  { id: "owners", label: "Owners" },
  { id: "tenants", label: "Tenants" },
  { id: "leases", label: "Leases" }
];

function tabHref(tab: PortfolioTab, preserve?: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  p.set("tab", tab);
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v) {
        p.set(k, v);
      }
    }
  }
  return `/admin/portfolio?${p.toString()}`;
}

function Kpi({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function RelLinks({
  propertyId,
  unitId,
  tenantId,
  leaseId
}: {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {propertyId ? (
        <Link href={tabHref("buildings")} className="text-primary hover:underline">
          Buildings hub
        </Link>
      ) : null}
      {propertyId ? (
        <Link href={`/admin/portfolio/properties/${propertyId}`} className="text-primary hover:underline">
          Building detail
        </Link>
      ) : null}
      {unitId ? (
        <Link href={`/admin/units/${unitId}`} className="text-primary hover:underline">
          Unit
        </Link>
      ) : null}
      {tenantId ? (
        <Link href={`/admin/tenants/${tenantId}`} className="text-primary hover:underline">
          Tenant
        </Link>
      ) : null}
      {leaseId ? (
        <Link href={`/admin/leases/${leaseId}`} className="text-primary hover:underline">
          Lease
        </Link>
      ) : null}
    </div>
  );
}

export function PortfolioWorkspace({
  tab,
  unitPropertyId,
  unitOccupancy,
  leasePropertyId,
  leaseStatus,
  leaseQ,
  data
}: {
  tab: PortfolioTab;
  unitPropertyId?: string;
  unitOccupancy?: PortfolioUnitOccupancy;
  leasePropertyId?: string;
  leaseStatus?: string;
  leaseQ?: string;
  data: PortfolioWorkspaceData;
}) {
  const { snapshot } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/20 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-border/80 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Portfolio</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Owner → building → unit → lease → tenant. Ownership can sit on the building record, on individual units, or
            both (unit direct owner overrides the building owner for that unit). Use the tabs below to work each slice.
          </p>
          <nav
            className="mt-8 flex flex-wrap gap-2 border-t border-border/60 pt-6"
            aria-label="Portfolio sections"
          >
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={tabHref(t.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="py-10">{renderTab(tab, { unitPropertyId, unitOccupancy, leasePropertyId, leaseStatus, leaseQ, data })}</div>
      </div>
    </div>
  );
}

function renderTab(
  tab: PortfolioTab,
  ctx: {
    unitPropertyId?: string;
    unitOccupancy?: PortfolioUnitOccupancy;
    leasePropertyId?: string;
    leaseStatus?: string;
    leaseQ?: string;
    data: PortfolioWorkspaceData;
  }
): ReactNode {
  const { data, unitPropertyId, unitOccupancy, leasePropertyId, leaseStatus, leaseQ } = ctx;
  const s = data.snapshot;

  if (tab === "overview") {
    return (
      <div className="space-y-12">
        <section>
          <SectionTitle
            title="At a glance"
            subtitle="Calendar-active leases use status “active” with start/end spanning today (UTC)."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Total buildings" value={s.propertyCount} />
            <Kpi label="Total units" value={s.unitCount} />
            <Kpi label="Occupied units" value={s.occupiedUnitCount} hint="Units with an active lease today" />
            <Kpi label="Vacant units" value={s.vacantUnitCount} />
            <Kpi label="Active leases" value={s.activeLeaseCount} />
            <Kpi label="Expiring soon" value={s.expiringLeaseCount} hint="Active leases ending within 90 days" />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm lg:col-span-1">
            <SectionTitle title="Recently added leases" subtitle="Newest by record creation" />
            <ul className="mt-4 space-y-4">
              {data.recentLeases.length === 0 ? (
                <li className="text-sm text-muted-foreground">No leases yet.</li>
              ) : (
                data.recentLeases.map((l) => (
                  <li key={l.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                    <p className="font-medium text-foreground">{l.tenantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.propertyCode} · {l.unitNumber} · {l.startDate} → {l.endDate}
                    </p>
                    <RelLinks propertyId={l.propertyId} unitId={l.unitId} tenantId={l.tenantId} leaseId={l.id} />
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm lg:col-span-1">
            <SectionTitle title="Vacant units" subtitle="No calendar-active lease today" />
            <ul className="mt-4 space-y-4">
              {data.vacantUnits.length === 0 ? (
                <li className="text-sm text-muted-foreground">No vacant units in the first page of inventory.</li>
              ) : (
                data.vacantUnits.map((u) => (
                  <li key={u.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                    <p className="font-medium text-foreground">
                      {u.propertyCode} · Unit {u.unitNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">Unit status: {u.unitStatus}</p>
                    <RelLinks propertyId={u.propertyId} unitId={u.id} />
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-xs">
              <Link href={tabHref("units", { occupancy: "vacant" })} className="font-medium text-primary hover:underline">
                View all vacant units →
              </Link>
            </p>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm lg:col-span-1">
            <SectionTitle title="Leases expiring soon" subtitle="Within 90 days, still active" />
            <ul className="mt-4 space-y-4">
              {data.expiringLeases.length === 0 ? (
                <li className="text-sm text-muted-foreground">None in this window.</li>
              ) : (
                data.expiringLeases.map((l) => (
                  <li key={l.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                    <p className="font-medium text-foreground">{l.tenantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.propertyName} · {l.unitNumber} · ends {l.endDate}
                    </p>
                    <RelLinks unitId={l.unitId} leaseId={l.id} />
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-xs">
              <Link href={tabHref("leases")} className="font-medium text-primary hover:underline">
                Open leases workspace →
              </Link>
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (tab === "buildings") {
    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            title="Buildings"
            subtitle="Building-level owner is optional. Units may add a direct owner that overrides the building for that unit."
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
            <Link href="/admin/properties/new" className="text-primary hover:underline">
              New building →
            </Link>
            <Link href="/admin/properties" className="text-primary hover:underline">
              Owners & financial toggles →
            </Link>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Occupied</th>
                <th className="px-4 py-3 font-medium">Building owner</th>
                <th className="px-4 py-3 font-medium">Ownership summary</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {data.propertyRows.map((p) => (
                <tr key={p.id} className="hover:bg-muted/25">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {p.code} · {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Financial visibility: {p.ownerFinancialAccess ? "On" : "Off"}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{p.unitCount}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {p.occupiedUnits}
                    {p.unitCount ? (
                      <span className="ml-1 text-xs">
                        ({Math.round((p.occupiedUnits / p.unitCount) * 100)}%)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.owner ? (
                      <>
                        {p.owner.fullName}
                        <br />
                        <span className="text-xs">{p.owner.email}</span>
                      </>
                    ) : (
                      <span className="text-xs">None</span>
                    )}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-xs text-muted-foreground">{p.ownershipSummary}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/portfolio/properties/${p.id}`} className="font-medium text-primary hover:underline">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (tab === "units") {
    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            title="Units"
            subtitle="Each unit belongs to a building. Resolved owner = direct unit owner, else building owner, else unassigned."
          />
          <Link href="/admin/units/new" className="text-sm font-medium text-primary hover:underline">
            New unit →
          </Link>
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card/50 p-4" method="get">
          <input type="hidden" name="tab" value="units" />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Building
            <select
              name="property"
              defaultValue={unitPropertyId ?? ""}
              className="h-10 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">All buildings</option>
              {data.propertyOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Occupancy
            <select
              name="occupancy"
              defaultValue={unitOccupancy ?? "all"}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Apply
          </button>
        </form>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Resolved owner</th>
                <th className="px-4 py-3 font-medium">Inventory status</th>
                <th className="px-4 py-3 font-medium">Occupancy</th>
                <th className="px-4 py-3 font-medium">Tenant / lease</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {data.unitRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No units match these filters.
                  </td>
                </tr>
              ) : (
                data.unitRows.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3 font-medium text-foreground">{u.unitNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.propertyCode} · {u.propertyName}
                    </td>
                    <td className="max-w-[13rem] px-4 py-3 text-xs text-muted-foreground">
                      <span className="text-foreground">{u.resolvedOwnerLabel}</span>
                      {u.directUnitOwner ? (
                        <p className="mt-1 text-[11px]">Direct on unit</p>
                      ) : u.buildingOwner ? (
                        <p className="mt-1 text-[11px]">From building</p>
                      ) : (
                        <p className="mt-1 text-[11px]">Unassigned</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.unitStatus}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          u.occupancy === "occupied" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {u.occupancy === "occupied" ? "Occupied" : "Vacant"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.lease ? (
                        <>
                          {u.lease.tenantName}
                          <br />
                          <span className="text-xs">
                            Lease to {u.lease.endDate} · {u.lease.status}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/units/${u.id}`} className="font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (tab === "owners") {
    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            title="Owners"
            subtitle="Owner role users: building-level assignments, direct unit stakes, and units on buildings they own."
          />
          <Link
            href="/admin/owners/new"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create owner account
          </Link>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Buildings</th>
                <th className="px-4 py-3 font-medium">Units on those buildings</th>
                <th className="px-4 py-3 font-medium">Direct unit stakes</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {data.ownerRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No owner-role users yet.
                  </td>
                </tr>
              ) : (
                data.ownerRows.map((o) => (
                  <tr key={o.userId} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.fullName}</p>
                      <p className="text-xs text-muted-foreground">{o.email}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{o.buildingsOwned}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{o.unitsOnOwnedBuildings}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{o.unitsOwnedDirectly}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={tabHref("buildings")} className="font-medium text-primary hover:underline">
                        Buildings hub
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (tab === "tenants") {
    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle title="Tenants" subtitle="Tenant accounts and their current calendar-active lease, if any." />
          <Link href="/admin/tenants/new" className="text-sm font-medium text-primary hover:underline">
            New tenant user →
          </Link>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Unit / building</th>
                <th className="px-4 py-3 font-medium">Lease</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {data.tenantRows.map((t) => (
                <tr key={t.userId} className="hover:bg-muted/25">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{t.fullName}</p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                    {!t.isActive ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Inactive</p> : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.lease ? (
                      <>
                        {t.lease.propertyName} · {t.lease.unitNumber}
                      </>
                    ) : (
                      <span className="text-xs">No active lease</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.lease ? (
                      <>
                        {t.lease.startDate} → {t.lease.endDate}
                        <br />
                        <span className="capitalize">{t.lease.status}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/tenants/${t.userId}`} className="font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  /* leases */
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle title="Leases" subtitle="Tenant ↔ unit ↔ building. Owner for reporting is resolved from the unit." />
        <Link href="/admin/leases/new" className="text-sm font-medium text-primary hover:underline">
          New lease →
        </Link>
      </div>
      <form className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card/50 p-4" method="get">
        <input type="hidden" name="tab" value="leases" />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Building
          <select
            name="leaseProperty"
            defaultValue={leasePropertyId ?? ""}
            className="h-10 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">All buildings</option>
            {data.propertyOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select
            name="leaseStatus"
            defaultValue={leaseStatus ?? ""}
            className="h-10 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Any status</option>
            {CANONICAL_LEASE_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input
            name="leaseQ"
            type="search"
            defaultValue={leaseQ ?? ""}
            placeholder="Tenant, unit, building…"
            className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
        >
          Apply
        </button>
      </form>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Unit · building</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Rent</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {data.leaseRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No leases match these filters.
                </td>
              </tr>
            ) : (
              data.leaseRows.map((l) => (
                <tr key={l.id} className="hover:bg-muted/25">
                  <td className="px-4 py-3 font-medium text-foreground">{l.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.propertyCode} · {l.propertyName}
                    <br />
                    <span className="text-xs">Unit {l.unitNumber}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{l.status}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {l.startDate} → {l.endDate}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{l.rentAmount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/leases/${l.id}`} className="font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
