import Link from "next/link";
import { CreateTenantRequestForm } from "@/components/tenant-requests/create-tenant-request-form";
import { listTenantRequestsForLease } from "@/server/queries/tenant-requests";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";
import {
  isTerminalTenantRequestStatus,
  tenantRequestKindLabel,
  tenantRequestStatusLabel
} from "@/lib/tenant-requests/statuses";
import { cn } from "@/lib/utils";

export default async function TenantRequestsPage() {
  const { userId, lease } = await requireTenantOperationalLease();
  const requests = await listTenantRequestsForLease(userId, lease.leaseId, lease.building.id, lease.unit.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renewal, transfer, and handover requests for your unit. You will see status updates as the team reviews them.
        </p>
      </header>

      <>
          <CreateTenantRequestForm />
          <section className="rounded-xl border border-border bg-card shadow-sm" aria-labelledby="tr-list-heading">
            <div className="border-b border-border p-4 sm:p-5">
              <h2 id="tr-list-heading" className="text-base font-semibold tracking-tight">
                Your requests
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {lease.building.name} · Unit {lease.unit.unitNumber}
              </p>
            </div>
            {requests.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground sm:p-5">No requests yet for this lease.</p>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/tenant/requests/${r.id}`}
                      className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{r.jobNo}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            isTerminalTenantRequestStatus(r.status)
                              ? "bg-muted text-muted-foreground"
                              : r.status === "submitted" || r.status === "under_review"
                                ? "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                                : "bg-secondary text-secondary-foreground"
                          )}
                        >
                          {tenantRequestStatusLabel(r.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">{tenantRequestKindLabel(r.requestKind)}</span>
                      </div>
                      <p className="mt-1 font-medium text-foreground">{r.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
      </>
    </div>
  );
}
