import { isUnitListingComplete } from "@/lib/units/public-listing";
import type { Prisma } from "@prisma/client";

type ActiveLease = {
  id: string;
  endDate: string;
  tenantName: string;
};

export function AdminUnitVisibilityPanel({
  unit
}: {
  unit: {
    listingTitle: string | null;
    listingDescription: string | null;
    listingCoverImageUrl: string | null;
    listingMonthlyPrice: Prisma.Decimal | null;
    monthlyRent: Prisma.Decimal | null;
    listingGalleryUrls: Prisma.JsonValue | null;
    activeLease: ActiveLease | null;
  };
}) {
  const complete = isUnitListingComplete(unit);
  const onPublicSite = !unit.activeLease && complete;

  const checks = [
    { ok: Boolean(unit.listingTitle?.trim()), label: "Listing title" },
    { ok: Boolean(unit.listingDescription?.trim()), label: "Public description" },
    {
      ok: Boolean(unit.listingMonthlyPrice ?? unit.monthlyRent),
      label: "Monthly price (listing or rent)"
    },
    { ok: Boolean(unit.listingCoverImageUrl?.trim()), label: "Cover image" }
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Lease status (today)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Public listings hide units with a calendar-active lease (status active, dates spanning today UTC).
        </p>
        {unit.activeLease ? (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Occupied — not shown on public listings</p>
            <p className="mt-1 text-muted-foreground">
              Tenant {unit.activeLease.tenantName} · lease ends {unit.activeLease.endDate}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground">
            No active lease on this unit — eligible for the public site if listing data is complete.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Listing completeness</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <span className={c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                {c.ok ? "✓" : "○"}
              </span>
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Public website</h2>
        <p className="mt-3 text-lg font-semibold text-foreground">
          {onPublicSite ? "Visible on /listings" : "Hidden from /listings"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {onPublicSite
            ? "This unit appears automatically — no publish toggle."
            : unit.activeLease
              ? "Will appear automatically when the active lease ends (or becomes inactive) and listing fields stay complete."
              : "Complete the listing tab (title, description, price, cover) to go live."}
        </p>
      </div>
    </div>
  );
}
