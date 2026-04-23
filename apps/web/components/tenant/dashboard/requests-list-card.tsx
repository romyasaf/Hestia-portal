import Link from "next/link";
import { tenantRequestKindLabel, tenantRequestStatusLabel } from "@/lib/tenant-requests/statuses";
import type { TenantRequestRow } from "@/server/queries/tenant-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  requests: TenantRequestRow[];
  className?: string;
};

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "cancelled" || s === "rejected") {
    return "bg-muted text-muted-foreground";
  }
  if (s === "submitted" || s === "under_review") {
    return "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100";
  }
  return "bg-secondary text-secondary-foreground";
}

export function RequestsListCard({ requests, className }: Props) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6", className)}
      aria-labelledby="requests-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="requests-heading" className="text-base font-semibold tracking-tight sm:text-lg">
          My requests
        </h2>
        <Link href="/tenant/requests" className="text-xs font-medium text-primary hover:underline">
          All requests
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
        Jobs you submitted for this unit or building (used as tenant requests until a dedicated table is migrated).
      </p>
      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/tenant/requests/${r.id}`}
                className="block rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/30 sm:border-border sm:bg-muted/20 sm:px-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.jobNo}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusTone(r.status))}>
                    {tenantRequestStatusLabel(r.status)}
                  </span>
                  <span className="text-xs text-muted-foreground">{tenantRequestKindLabel(r.requestKind)}</span>
                </div>
                <p className="mt-1 font-medium text-foreground">{r.title}</p>
                {r.scope ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.scope}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">Created {new Date(r.createdAt).toLocaleDateString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
