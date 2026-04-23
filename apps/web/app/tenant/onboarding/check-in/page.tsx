import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { OnboardingCheckInBootstrap } from "@/components/tenant/onboarding/onboarding-check-in-bootstrap";
import { TenantOnboardingCheckInForm } from "@/components/tenant/onboarding/tenant-onboarding-check-in-form";
import { parseOnboardingInventory } from "@/lib/tenant-lifecycle/inventory-template";
import { prisma } from "@/lib/prisma";
import { requireTenantOnboardingLease, onboardingPathForStep } from "@/server/tenant-portal/require-onboarding";

export default async function TenantOnboardingCheckInPage() {
  const { lease, step } = await requireTenantOnboardingLease();
  if (step !== "checkin") {
    redirect(onboardingPathForStep(step));
  }

  const row = await prisma.lease.findUnique({
    where: { id: lease.leaseId },
    select: { onboardingCheckinInventory: true }
  });
  const lines = parseOnboardingInventory(row?.onboardingCheckinInventory);

  return (
    <>
      <PortalShell kind="tenant" title="Apartment check-in">
        <p className="text-sm text-muted-foreground">
          Step 3 of 3: review the inventory for your unit. Confirm each line or report an issue. Submit when done —
          this creates your official check-in record.
        </p>
      </PortalShell>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <OnboardingCheckInBootstrap hasLines={lines.length > 0}>
          {lines.length > 0 ? <TenantOnboardingCheckInForm initialLines={lines} /> : (
            <p className="text-sm text-muted-foreground">Preparing your checklist…</p>
          )}
        </OnboardingCheckInBootstrap>
      </div>
    </>
  );
}
