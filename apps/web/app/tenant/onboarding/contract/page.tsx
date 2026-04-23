import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { TenantContractSignForm } from "@/components/tenant/onboarding/tenant-contract-sign-form";
import { buildLeaseContractBody } from "@/lib/tenant-lifecycle/lease-contract";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/session";
import { requireTenantOnboardingLease, onboardingPathForStep } from "@/server/tenant-portal/require-onboarding";

export default async function TenantOnboardingContractPage() {
  const { lease, step } = await requireTenantOnboardingLease();
  if (step !== "contract") {
    redirect(onboardingPathForStep(step));
  }

  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, email: true }
  });
  if (!me) {
    redirect("/login");
  }

  const body = buildLeaseContractBody({
    lease,
    tenantFullName: me.fullName,
    tenantEmail: me.email
  });

  return (
    <>
      <PortalShell kind="tenant" title="Welcome — sign your lease">
        <p className="text-sm text-muted-foreground">
          Step 1 of 3: review the summary below, then sign electronically. You can print or download a copy for your
          records.
        </p>
      </PortalShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-xs sm:text-sm">
          {body}
        </pre>
        <TenantContractSignForm contractText={body} />
      </div>
    </>
  );
}
