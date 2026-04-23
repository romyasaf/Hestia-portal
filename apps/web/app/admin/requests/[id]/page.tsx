import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantRequestStatusControls } from "@/components/tenant-requests/tenant-request-status-controls";
import { getTenantRequestJobById, toTenantRequestDetail } from "@/server/queries/tenant-requests";
import { requireSession } from "@/server/auth/session";
import {
  isTerminalTenantRequestStatus,
  listAllowedTenantRequestNextStatuses,
  tenantRequestKindLabel,
  tenantRequestStatusLabel
} from "@/lib/tenant-requests/statuses";
import { cn } from "@/lib/utils";

type Props = { params: { id: string } };

export default async function AdminTenantRequestDetailPage({ params }: Props) {
  const session = await requireSession();
  const row = await getTenantRequestJobById(params.id);
  if (!row) {
    notFound();
  }

  const detail = toTenantRequestDetail(row);
  const roles = session.user.roles ?? [];
  const nextStatuses = listAllowedTenantRequestNextStatuses(detail.status, roles);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p>
        <Link href="/admin/requests" className="text-sm font-medium text-primary hover:underline">
          ← All tenant requests
        </Link>
      </p>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{detail.jobNo}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isTerminalTenantRequestStatus(detail.status)
                ? "bg-muted text-muted-foreground"
                : detail.status === "submitted" || detail.status === "under_review"
                  ? "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                  : "bg-secondary text-secondary-foreground"
            )}
          >
            {tenantRequestStatusLabel(detail.status)}
          </span>
          <span className="text-xs text-muted-foreground">{tenantRequestKindLabel(detail.requestKind)}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{detail.title}</h1>
        <p className="text-sm text-muted-foreground">
          Requester {detail.requesterName} ({detail.requesterEmail})
        </p>
        <p className="text-sm text-muted-foreground">
          Created {new Date(detail.createdAt).toLocaleString()}
          {detail.propertyName ? (
            <>
              {" "}
              · {detail.propertyName}
              {detail.unitNumber ? ` · Unit ${detail.unitNumber}` : ""}
            </>
          ) : null}
        </p>
      </header>

      {detail.scope ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Tenant details</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{detail.scope}</p>
        </section>
      ) : null}

      <TenantRequestStatusControls jobId={detail.id} nextStatuses={nextStatuses} />

      {!isTerminalTenantRequestStatus(detail.status) ? (
        <p className="text-xs text-muted-foreground">
          Move the request through review: typically <strong>Under review</strong>, then <strong>Approved</strong> or{" "}
          <strong>Rejected</strong>, and <strong>Completed</strong> when work is done.
        </p>
      ) : null}
    </div>
  );
}
