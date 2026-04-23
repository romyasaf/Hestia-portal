import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import type { ActiveLeaseForTenant } from "@/server/queries/leases";
import { getTenantPortalContext, type TenantOnboardingStep } from "@/server/queries/tenant-portal-context";

export function onboardingPathForStep(step: TenantOnboardingStep): string {
  if (step === "contract") {
    return "/tenant/onboarding/contract";
  }
  if (step === "cheques") {
    return "/tenant/onboarding/cheques";
  }
  if (step === "checkin") {
    return "/tenant/onboarding/check-in";
  }
  return "/tenant/dashboard";
}

/** Tenant must be in onboarding with a calendar-active lease. */
export async function requireTenantOnboardingLease(): Promise<{
  userId: string;
  lease: ActiveLeaseForTenant;
  step: TenantOnboardingStep;
}> {
  const session = await requireSession();
  const ctx = await getTenantPortalContext(session.user.id);
  if (ctx.mode !== "onboarding" || !ctx.calendarLease || !ctx.onboardingStep) {
    redirect(ctx.mode === "active" ? "/tenant/dashboard" : "/tenant/account");
  }
  return {
    userId: session.user.id,
    lease: ctx.calendarLease,
    step: ctx.onboardingStep
  };
}
