import { CheckoutStatusControls } from "@/components/checkout/checkout-status-controls";
import { RequestCheckoutForm } from "@/components/checkout/request-checkout-form";
import { checkoutStatusLabel } from "@/lib/checkout/statuses";
import { isTerminalCheckoutStatus } from "@/lib/checkout/statuses";
import { listAllowedCheckoutNextStatuses } from "@/lib/checkout/statuses";
import { requireSession } from "@/server/auth/session";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";
import {
  getOpenCheckoutForLease,
  listRecentCheckoutsForLease,
  toCheckoutDetail
} from "@/server/queries/checkout";
import { cn } from "@/lib/utils";

export default async function TenantCheckoutPage() {
  const session = await requireSession();
  const { lease } = await requireTenantOperationalLease();
  const roles = session.user.roles ?? [];

  const open = await getOpenCheckoutForLease(lease.leaseId);
  const history = await listRecentCheckoutsForLease(lease.leaseId, open?.id);
  const openDetail = open ? toCheckoutDetail(open) : null;
  const nextStatuses = openDetail ? listAllowedCheckoutNextStatuses(openDetail.status, roles) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Request a move-out date. The team will schedule a visit and mark checkout complete when finished.
        </p>
      </header>

      <>
          {openDetail ? (
            <section className="space-y-6">
              <div
                className={cn(
                  "rounded-xl border p-4 sm:p-6",
                  openDetail.status === "requested" ||
                  openDetail.status === "scheduled" ||
                  openDetail.status === "inspected"
                    ? "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/25"
                    : "border-border bg-card"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      isTerminalCheckoutStatus(openDetail.status)
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                    )}
                  >
                    {checkoutStatusLabel(openDetail.status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Requested {new Date(openDetail.createdAt).toLocaleString()}
                  </span>
                </div>
                {openDetail.preferredMoveOutDate ? (
                  <p className="mt-3 text-sm">
                    <span className="text-muted-foreground">Preferred move-out: </span>
                    <span className="font-medium">{openDetail.preferredMoveOutDate}</span>
                  </p>
                ) : null}
                {openDetail.scheduledAt ? (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Scheduled: </span>
                    <span className="font-medium">{new Date(openDetail.scheduledAt).toLocaleString()}</span>
                  </p>
                ) : null}
                {openDetail.tenantNotes ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{openDetail.tenantNotes}</p>
                ) : null}
                {openDetail.adminNotes ? (
                  <div className="mt-4 rounded-lg border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">From the office</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{openDetail.adminNotes}</p>
                  </div>
                ) : null}
                {openDetail.inspectionOutcome ? (
                  <div className="mt-4 rounded-lg border border-border bg-background/80 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Inspection</p>
                    <p className="mt-1 font-medium capitalize">{openDetail.inspectionOutcome}</p>
                    {openDetail.damagesSummary ? (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{openDetail.damagesSummary}</p>
                    ) : null}
                    {openDetail.deductionAmount ? (
                      <p className="mt-2 text-xs text-muted-foreground">Deduction: {openDetail.deductionAmount}</p>
                    ) : null}
                    {openDetail.depositReturnAmount ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Deposit return: {openDetail.depositReturnAmount}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <CheckoutStatusControls checkoutId={openDetail.id} nextStatuses={nextStatuses} showAdminNotes={false} />
            </section>
          ) : (
            <RequestCheckoutForm />
          )}

          {history.length > 0 ? (
            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-semibold">History</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{checkoutStatusLabel(h.status)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
      </>
    </div>
  );
}
