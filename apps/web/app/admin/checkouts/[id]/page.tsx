import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutCompleteForm, CheckoutInspectionForm } from "@/components/checkout/checkout-inspection-forms";
import { CheckoutStatusControls } from "@/components/checkout/checkout-status-controls";
import { ScheduleCheckoutForm } from "@/components/checkout/schedule-checkout-form";
import { checkoutStatusLabel } from "@/lib/checkout/statuses";
import { isTerminalCheckoutStatus } from "@/lib/checkout/statuses";
import { listAllowedCheckoutNextStatuses } from "@/lib/checkout/statuses";
import { requireSession } from "@/server/auth/session";
import { getCheckoutById, toCheckoutDetail } from "@/server/queries/checkout";
import { cn } from "@/lib/utils";

type Props = { params: { id: string } };

export default async function AdminCheckoutDetailPage({ params }: Props) {
  const session = await requireSession();
  const row = await getCheckoutById(params.id);
  if (!row) {
    notFound();
  }

  const detail = toCheckoutDetail(row);
  const lease = row.lease;
  const roles = session.user.roles ?? [];
  const nextStatuses = listAllowedCheckoutNextStatuses(detail.status, roles);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p>
        <Link href="/admin/checkouts" className="text-sm font-medium text-primary hover:underline">
          ← All checkouts
        </Link>
      </p>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isTerminalCheckoutStatus(detail.status)
                ? "bg-muted text-muted-foreground"
                : "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
            )}
          >
            {checkoutStatusLabel(detail.status)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          {lease.tenant.fullName} ({lease.tenant.email}) · {lease.unit.property.name} · Unit {lease.unit.unitNumber}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6 text-sm space-y-2">
        {detail.preferredMoveOutDate ? (
          <p>
            <span className="text-muted-foreground">Preferred move-out: </span>
            <span className="font-medium">{detail.preferredMoveOutDate}</span>
          </p>
        ) : null}
        {detail.scheduledAt ? (
          <p>
            <span className="text-muted-foreground">Scheduled: </span>
            <span className="font-medium">{new Date(detail.scheduledAt).toLocaleString()}</span>
          </p>
        ) : null}
        {detail.tenantNotes ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tenant notes</p>
            <p className="mt-1 whitespace-pre-wrap">{detail.tenantNotes}</p>
          </div>
        ) : null}
        {detail.adminNotes ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Admin notes (saved)</p>
            <p className="mt-1 whitespace-pre-wrap">{detail.adminNotes}</p>
          </div>
        ) : null}
      </section>

      {detail.status === "requested" ? <ScheduleCheckoutForm checkoutId={detail.id} /> : null}

      <CheckoutInspectionForm
        checkoutId={detail.id}
        status={detail.status}
        initialOutcome={detail.inspectionOutcome}
        initialDamages={detail.damagesSummary}
        initialDeduction={detail.deductionAmount}
        initialDepositReturn={detail.depositReturnAmount}
      />

      <CheckoutCompleteForm checkoutId={detail.id} status={detail.status} />

      <CheckoutStatusControls checkoutId={detail.id} nextStatuses={nextStatuses} showAdminNotes />
    </div>
  );
}
