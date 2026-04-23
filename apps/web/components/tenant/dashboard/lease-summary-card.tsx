import type { ActiveLeaseForTenant } from "@/server/queries/leases";
import { cn } from "@/lib/utils";

type Props = {
  lease: ActiveLeaseForTenant;
  className?: string;
};

export function LeaseSummaryCard({ lease, className }: Props) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className
      )}
      aria-labelledby="lease-summary-heading"
    >
      <h2 id="lease-summary-heading" className="text-base font-semibold tracking-tight sm:text-lg">
        Active lease
      </h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Building</dt>
          <dd className="mt-1 font-medium text-foreground">{lease.building.name}</dd>
          <dd className="text-muted-foreground">
            {lease.building.code} · {lease.building.addressLine1}, {lease.building.city}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</dt>
          <dd className="mt-1 font-medium text-foreground">Unit {lease.unit.unitNumber}</dd>
          <dd className="text-muted-foreground">
            {lease.unit.unitType ?? "—"}
            {lease.unit.bedrooms != null || lease.unit.bathrooms != null
              ? ` · ${lease.unit.bedrooms ?? "—"} bed / ${lease.unit.bathrooms ?? "—"} bath`
              : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term</dt>
          <dd className="mt-1 font-medium text-foreground">
            {lease.startDate} → {lease.endDate}
          </dd>
          <dd className="text-muted-foreground">Status: {lease.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rent & deposit</dt>
          <dd className="mt-1 text-foreground">
            Rent <span className="font-semibold tabular-nums">{lease.rentAmount}</span>
          </dd>
          <dd className="mt-1 text-muted-foreground tabular-nums">Deposit {lease.depositAmount}</dd>
        </div>
      </dl>
    </section>
  );
}
