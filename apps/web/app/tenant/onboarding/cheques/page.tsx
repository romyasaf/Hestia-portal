import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { TenantChequesStepForm } from "@/components/tenant/onboarding/tenant-cheques-step-form";
import { chequeDeliveryLabel } from "@/lib/tenant-lifecycle/cheque-states";
import { prisma } from "@/lib/prisma";
import { requireTenantOnboardingLease, onboardingPathForStep } from "@/server/tenant-portal/require-onboarding";

export default async function TenantOnboardingChequesPage() {
  const { lease, step } = await requireTenantOnboardingLease();
  if (step !== "cheques") {
    redirect(onboardingPathForStep(step));
  }

  const row = await prisma.lease.findUnique({
    where: { id: lease.leaseId },
    select: {
      chequeDeliveryState: true,
      chequeAppointmentAt: true,
      chequeAppointmentNotes: true,
      chequeMarkedDeliveredAt: true,
      chequeApprovedAt: true
    }
  });

  return (
    <>
      <PortalShell kind="tenant" title="Cheque delivery">
        <p className="text-sm text-muted-foreground">
          Step 2 of 3: book a handover appointment with the office, or confirm cheques were already delivered. The
          office must confirm receipt before you can continue to check-in.
        </p>
      </PortalShell>
      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">Status</p>
          <p className="mt-1 text-muted-foreground">
            {row ? chequeDeliveryLabel(row.chequeDeliveryState) : "—"}
          </p>
          {row?.chequeAppointmentAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Appointment: {row.chequeAppointmentAt.toLocaleString()}
              {row.chequeAppointmentNotes ? ` — ${row.chequeAppointmentNotes}` : ""}
            </p>
          ) : null}
          {row?.chequeMarkedDeliveredAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Marked delivered: {row.chequeMarkedDeliveredAt.toLocaleString()}
            </p>
          ) : null}
          {row?.chequeApprovedAt ? (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              Confirmed by office: {row.chequeApprovedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <TenantChequesStepForm
          state={row?.chequeDeliveryState ?? "pending"}
          canBook={row?.chequeDeliveryState === "pending" || row?.chequeDeliveryState === "appointment_booked"}
          canMarkDelivered={
            row?.chequeDeliveryState === "pending" || row?.chequeDeliveryState === "appointment_booked"
          }
        />
      </div>
    </>
  );
}
