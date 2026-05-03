import Link from "next/link";
import { CheckInReviewControls } from "@/components/checkin/check-in-review-controls";
import { checkInStatusLabel } from "@/lib/checkin/statuses";
import { isTerminalCheckInStatus } from "@/lib/checkin/statuses";
import { listAllowedCheckInNextStatuses } from "@/lib/checkin/statuses";
import {
  getOpenCheckInForLease,
  listRecentCheckInsForLease,
  toCheckInDetail
} from "@/server/queries/checkin";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";
import { cn } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";

export default async function TenantCheckinPage() {
  const session = await requireSession();
  const { lease } = await requireTenantOperationalLease();
  const roles = session.user.roles ?? [];

  const open = await getOpenCheckInForLease(lease.leaseId);
  const history = await listRecentCheckInsForLease(lease.leaseId, open?.id);
  const openDetail = open ? toCheckInDetail(open) : null;
  const nextStatuses = openDetail ? listAllowedCheckInNextStatuses(openDetail.status, roles) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your move-in check-in was completed during onboarding. Open reviews appear here; new problems after
          move-in go through{" "}
          <Link href="/tenant/maintenance" className="font-medium text-primary hover:underline">
            maintenance
          </Link>
          .
        </p>
      </header>

      <>
        {openDetail ? (
          <section className="space-y-6">
            <div
              className={cn(
                "rounded-xl border p-4 sm:p-6",
                openDetail.status === "submitted" || openDetail.status === "under_review"
                  ? "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/25"
                  : "border-border bg-card"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isTerminalCheckInStatus(openDetail.status)
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                  )}
                >
                  {checkInStatusLabel(openDetail.status)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Submitted {new Date(openDetail.submittedAt).toLocaleString()}
                </span>
              </div>
              {openDetail.tenantNotes ? (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground">Your notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{openDetail.tenantNotes}</p>
                </div>
              ) : null}
              {openDetail.adminNotes ? (
                <div className="mt-4 rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">From the office</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{openDetail.adminNotes}</p>
                </div>
              ) : null}
              <div className="mt-4">
                <p className="text-sm font-semibold">Issues logged</p>
                {openDetail.issues.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No issues listed on submission.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {openDetail.issues.map((i) => (
                      <li key={i.id} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
                        <span className="font-medium">{i.summary}</span>
                        {i.details ? (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{i.details}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(i.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <CheckInReviewControls checkInId={openDetail.id} nextStatuses={nextStatuses} adminNotesEnabled={false} />
          </section>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No open check-in</p>
            <p className="mt-2">
              There is no check-in awaiting review on this lease. Use maintenance for new issues after move-in.
            </p>
          </div>
        )}

        {history.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold">Previous check-ins on this lease</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-muted-foreground">{new Date(h.submittedAt).toLocaleDateString()}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{checkInStatusLabel(h.status)}</span>
                  <span className="text-xs text-muted-foreground">{h.issueCount} issue(s)</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    </div>
  );
}
