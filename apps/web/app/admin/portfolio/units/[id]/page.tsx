import Link from "next/link";
import { notFound } from "next/navigation";
import { formatFinanceMoney } from "@/lib/finance/format-money";
import { getPortfolioUnitSystemDetail } from "@/server/queries/unit-lifecycle";
import { AdminUnitCheckoutUpdateForm } from "@/components/admin/portfolio/admin-unit-checkout-update-form";

type Props = { params: { id: string } };

export default async function PortfolioUnitDetailPage({ params }: Props) {
  const d = await getPortfolioUnitSystemDetail(params.id);
  if (!d) {
    notFound();
  }

  const headline = d.listing.title || `Unit ${d.unitNumber}`;
  const editBase = `/admin/units/${d.id}`;
  const hasActive = d.occupancy === "occupied";
  const publicVisible =
    !hasActive &&
    Boolean(
      d.listing.title &&
        d.listing.description &&
        d.listing.coverImageUrl &&
        d.listing.displayPriceLabel !== "—"
    );
  const priceForRule = d.listing.displayPriceLabel !== "—";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/25 via-background to-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/portfolio?tab=units" className="font-medium text-primary hover:underline">
            ← Portfolio · Units
          </Link>
          {" · "}
          <Link href={`/admin/portfolio/properties/${d.property.id}`} className="font-medium text-primary hover:underline">
            {d.property.code} · Building
          </Link>
        </p>

        <header className="mt-8 border-b border-border/80 pb-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted sm:h-36 sm:w-52">
              {d.listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50 px-4 text-center">
                  <span className="text-2xl font-semibold tabular-nums text-muted-foreground">{d.unitNumber}</span>
                  <span className="mt-1 text-xs text-muted-foreground">No cover image</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {d.property.code} · {d.property.name}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{headline}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Central operational view for this unit — marketing, inventory, lease, maintenance, and finance.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={
                    d.occupancy === "occupied"
                      ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
                      : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {d.occupancy === "occupied" ? "Occupied" : "Available (no active lease)"}
                </span>
                <span className="text-lg font-semibold tabular-nums text-foreground">{d.listing.displayPriceLabel}</span>
                <span
                  className={
                    publicVisible && priceForRule
                      ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                      : "rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {publicVisible && priceForRule
                    ? "On public /listings"
                    : "Hidden from /listings"}
                </span>
                <span className="text-xs text-muted-foreground">Ops status: {d.unitStatus}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={`${editBase}?section=overview`}
                  className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
                >
                  Edit unit core
                </Link>
                <Link
                  href={`${editBase}?section=listing`}
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted/60"
                >
                  Edit listing
                </Link>
                <Link
                  href={`${editBase}?section=checkin`}
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted/60"
                >
                  Check-in & inventory
                </Link>
              </div>
            </div>
          </div>
        </header>

        <nav
          className="sticky top-0 z-10 -mx-4 mb-8 flex flex-wrap gap-2 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6"
          aria-label="Unit sections"
        >
          {(
            [
              ["overview", "1. Overview"],
              ["listing", "2. Listing / marketing"],
              ["inventory", "3. Inventory"],
              ["lease", "4. Lease + tenant"],
              ["maintenance", "5. Maintenance"],
              ["history", "6. Check-in / check-out"],
              ["finance", "7. Finance"]
            ] as const
          ).map(([h, l]) => (
            <a
              key={h}
              href={`#${h}`}
              className="rounded-full bg-muted/80 px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="space-y-10 pb-20">
          <section id="overview" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">1. Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Building, identification, size, layout, and resolved owner (unit → building → unassigned).
            </p>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Building</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {d.property.name} <span className="text-muted-foreground">({d.property.code})</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Resolved owner</dt>
                <dd className="mt-1 text-sm text-foreground">{d.resolvedOwnerLabel}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">Source: {d.resolvedOwnerSource}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Unit</dt>
                <dd className="mt-1 font-mono font-medium text-foreground">{d.unitNumber}</dd>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {[d.unitType, d.floor && `floor ${d.floor}`, d.bedrooms != null && `${d.bedrooms} bed`, d.bathrooms != null && `${d.bathrooms} bath`]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
                {d.areaSqm != null && Number(d.areaSqm) > 0 ? (
                  <dd className="mt-1 text-sm text-foreground">Area: {d.areaSqm.toString()} m²</dd>
                ) : null}
                {d.furnishingStatus ? (
                  <dd className="mt-1 text-sm capitalize text-muted-foreground">
                    Furnishing: {d.furnishingStatus.replace(/_/g, " ")}
                  </dd>
                ) : null}
                <dd className="mt-2 text-sm">
                  Operational rent: <span className="font-medium tabular-nums">{d.monthlyRentLabel}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section id="listing" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">2. Listing / marketing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Public copy and media. Appears on the site only when this unit is vacant, listing is complete, and a cover
              image exists. Internal notes and availability date stay admin-only.
            </p>
            <div className="mt-6 space-y-4 text-sm">
              {d.listingAvailabilityDate ? (
                <p>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Availability (marketing)</span>{" "}
                  <span className="ml-1">{d.listingAvailabilityDate}</span>
                </p>
              ) : null}
              {d.listing.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Internal notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{d.listing.notes}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{d.listing.description || "—"}</p>
              </div>
            </div>
          </section>

          <section id="inventory" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">3. Inventory (operational)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Structured per-unit list for check-in, check-out, and disputes. Not public. Use{" "}
              <Link href={editBase + "?section=checkin"} className="text-primary hover:underline">
                admin inventory + template
              </Link>
              .
            </p>
            {d.inventoryItems.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No structured items yet — copy from master on the admin unit page.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-xl border text-sm">
                {d.inventoryItems.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
                    <div>
                      <span className="font-medium text-foreground">{i.itemName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{i.category.replace(/_/g, " ")}</span>
                      {i.notes ? <p className="mt-1 text-xs text-muted-foreground">{i.notes}</p> : null}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">×{i.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-8 text-sm font-semibold text-foreground">Move-in template (check-in flow)</h3>
            {d.checkinTemplateLines.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No merged template lines.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-lg border text-sm">
                {d.checkinTemplateLines.map((line) => (
                  <li key={line.id} className="px-3 py-2 text-muted-foreground">
                    {line.label}{" "}
                    <span className="text-xs">({line.source === "master" ? "master" : "unit"})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="lease" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">4. Lease + tenant</h2>
            <p className="mt-1 text-sm text-muted-foreground">Only one calendar-active lease per unit. History below.</p>
            {d.activeLease ? (
              <div className="mt-4 rounded-lg border border-border/80 bg-background/50 p-4 text-sm">
                <p className="font-medium text-foreground">{d.activeLease.tenant.fullName}</p>
                <p className="text-xs text-muted-foreground">{d.activeLease.tenant.email}</p>
                <p className="mt-2 text-muted-foreground">
                  {d.activeLease.startDate} → {d.activeLease.endDate} · {d.activeLease.status}
                </p>
                <p className="mt-1 tabular-nums text-foreground">
                  Rent {formatFinanceMoney(Number(d.activeLease.rentAmount))} · Deposit{" "}
                  {formatFinanceMoney(Number(d.activeLease.depositAmount))}
                </p>
                <p className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                  <Link href={`/admin/leases/${d.activeLease.id}`} className="text-primary hover:underline">
                    Open lease
                  </Link>
                  <Link href={`/admin/tenants/${d.activeLease.tenant.id}`} className="text-primary hover:underline">
                    Tenant
                  </Link>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No active lease for this unit today (UTC calendar).</p>
            )}
            <h3 className="mt-8 text-sm font-semibold">Lease history</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {d.leaseHistory.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                >
                  <span>
                    {l.tenant.fullName} · {l.startDate}–{l.endDate}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {l.isCalendarActive ? "active now" : l.status}
                  </span>
                  <Link href={`/admin/leases/${l.id}`} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section id="maintenance" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">5. Maintenance</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tickets are scoped to the unit; lease/tenant when applicable.</p>
            <h3 className="mt-4 text-sm font-semibold text-amber-800 dark:text-amber-200">
              Open or in progress ({d.maintenance.open.length})
            </h3>
            {d.maintenance.open.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {d.maintenance.open.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/maintenance/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.ticketNo} — {t.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-6 text-sm font-semibold">Recent (incl. completed)</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {d.maintenance.all.slice(0, 12).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/maintenance/${t.id}`} className="hover:underline">
                    {t.ticketNo}
                  </Link>
                  <span className="text-xs">
                    {t.lease?.tenant.fullName ? `${t.lease.tenant.fullName} · ` : null}
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="history" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">6. Check-in & check-out history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Move-in issues are only collected during the onboarding check-in. After that, work goes through
              maintenance.
            </p>
            <h3 className="mt-4 text-sm font-semibold">Check-ins on this unit (via leases)</h3>
            {d.checkInCheckOut.checkIns.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {d.checkInCheckOut.checkIns.map((c) => (
                  <li key={c.id} className="rounded-md border border-border/60 px-3 py-2">
                    {new Date(c.submittedAt).toLocaleString()} — {c.status} · {c.tenant.fullName} · {c.issueCount} issue(s)
                    <br />
                    <Link href={`/admin/checkins/${c.id}`} className="text-xs text-primary hover:underline">
                      Open in admin
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-8 text-sm font-semibold">Check-outs</h3>
            {d.checkInCheckOut.checkOuts.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No checkout records for leases on this unit.</p>
            ) : (
              <ul className="mt-4 space-y-6 text-sm">
                {d.checkInCheckOut.checkOuts.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border/80 bg-muted/20 p-4"
                  >
                    <p className="font-medium text-foreground">
                      {c.tenant.fullName} · {c.status}
                    </p>
                    {c.scheduledAt ? (
                      <p className="text-xs text-muted-foreground">Inspection scheduled: {c.scheduledAt}</p>
                    ) : null}
                    {c.inspectionNotes ? (
                      <p className="mt-2 text-muted-foreground">
                        <span className="text-xs font-semibold uppercase">Inspection</span> {c.inspectionNotes}
                      </p>
                    ) : null}
                    {c.finalDecisionNotes || c.damagesSummary || c.inspectionOutcome ? (
                      <p className="mt-2 text-muted-foreground">
                        {c.damagesSummary || c.inspectionOutcome}
                        {c.finalDecisionNotes ? <span className="mt-1 block">Decision: {c.finalDecisionNotes}</span> : null}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <AdminUnitCheckoutUpdateForm checkOutId={c.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="finance" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">7. Finance summary (unit)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Rent-related receipts and expenses tagged to this unit.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-card px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Receipts (leases)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{d.finance.totalRentReceipts}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-card px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit expenses</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{d.finance.totalUnitExpenses}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-card px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Net (simple)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{d.finance.net}</p>
              </div>
            </div>
            {d.finance.recentReceipts.length > 0 ? (
              <ul className="mt-4 divide-y divide-border text-xs text-muted-foreground">
                {d.finance.recentReceipts.map((r) => (
                  <li key={r.id} className="flex justify-between py-1.5">
                    <span>{r.category ?? "receipt"}</span>
                    <span className="tabular-nums">{r.amount} · {new Date(r.receivedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-4 text-xs text-muted-foreground">
              Owner contract visibility: managed buildings see unit activity in the owner portal; operator (landlord) contracts
              are restricted from internal operational unit detail.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
