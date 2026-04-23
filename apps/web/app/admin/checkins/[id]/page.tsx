import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckInReviewControls } from "@/components/checkin/check-in-review-controls";
import { ConvertCheckInIssueButton } from "@/components/checkin/convert-check-in-issue-button";
import { checkInStatusLabel } from "@/lib/checkin/statuses";
import { isTerminalCheckInStatus } from "@/lib/checkin/statuses";
import { listAllowedCheckInNextStatuses } from "@/lib/checkin/statuses";
import { requireSession } from "@/server/auth/session";
import { getCheckInById, toCheckInDetail } from "@/server/queries/checkin";
import { cn } from "@/lib/utils";

type Props = { params: { id: string } };

export default async function AdminCheckInDetailPage({ params }: Props) {
  const session = await requireSession();
  const row = await getCheckInById(params.id);
  if (!row) {
    notFound();
  }

  const detail = toCheckInDetail(row);
  const lease = row.lease;
  const roles = session.user.roles ?? [];
  const nextStatuses = listAllowedCheckInNextStatuses(detail.status, roles);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p>
        <Link href="/admin/checkins" className="text-sm font-medium text-primary hover:underline">
          ← All check-ins
        </Link>
      </p>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isTerminalCheckInStatus(detail.status)
                ? "bg-muted text-muted-foreground"
                : "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
            )}
          >
            {checkInStatusLabel(detail.status)}
          </span>
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(detail.submittedAt).toLocaleString()}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in review</h1>
        <p className="text-sm text-muted-foreground">
          {lease.tenant.fullName} ({lease.tenant.email}) · {lease.unit.property.name} · Unit {lease.unit.unitNumber}
        </p>
      </header>

      {detail.tenantNotes ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Tenant notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{detail.tenantNotes}</p>
        </section>
      ) : null}

      {detail.adminNotes ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Admin notes (saved)</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{detail.adminNotes}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Issues ({detail.issues.length})</h2>
        {detail.issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No issues logged.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {detail.issues.map((i) => (
              <li key={i.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{i.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Severity: {i.severity}
                  {i.areaLabel ? ` · Area: ${i.areaLabel}` : ""}
                </p>
                {i.details ? <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{i.details}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleString()}</p>
                {i.convertedTicketId ? (
                  <p className="mt-2 text-xs font-medium text-primary">
                    Linked ticket ·{" "}
                    <Link href={`/admin/maintenance/${i.convertedTicketId}`} className="underline">
                      Open in maintenance
                    </Link>
                  </p>
                ) : (
                  <ConvertCheckInIssueButton
                    issueId={i.id}
                    disabled={isTerminalCheckInStatus(detail.status)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CheckInReviewControls checkInId={detail.id} nextStatuses={nextStatuses} adminNotesEnabled />
    </div>
  );
}
