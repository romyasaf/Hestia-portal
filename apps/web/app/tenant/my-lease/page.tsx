import Link from "next/link";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";

export default async function TenantMyLeasePage() {
  const { lease } = await requireTenantOperationalLease();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your current operational lease (read-only).</p>
      </header>

      <dl className="space-y-4 rounded-xl border border-border bg-card p-6 text-sm shadow-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1 font-medium capitalize">{lease.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</dt>
            <dd className="mt-1 tabular-nums">{lease.startDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</dt>
            <dd className="mt-1 tabular-nums">{lease.endDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rent</dt>
            <dd className="mt-1 tabular-nums">{lease.rentAmount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deposit</dt>
            <dd className="mt-1 tabular-nums">{lease.depositAmount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Building</dt>
            <dd className="mt-1">
              {lease.building.name} ({lease.building.code})
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</dt>
            <dd className="mt-1">{lease.unit.unitNumber}</dd>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            For changes to your lease, contact the office.{" "}
            <Link href="/tenant/requests" className="text-primary hover:underline">
              Submit a request
            </Link>{" "}
            for renewal or transfer.
          </p>
        </dl>
    </div>
  );
}
