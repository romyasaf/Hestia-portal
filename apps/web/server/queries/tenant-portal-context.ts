import type { ActiveLeaseForTenant } from "@/server/queries/leases";
import { getActiveLeaseForTenant, listPastLeasesForTenant, type PastLeaseRow } from "@/server/queries/leases";

export type TenantPortalMode = "onboarding" | "active" | "inactive";

export type TenantOnboardingStep = "contract" | "cheques" | "checkin" | "complete";

export function deriveOnboardingStep(lease: ActiveLeaseForTenant): TenantOnboardingStep {
  if (!lease.contractSignedAt) {
    return "contract";
  }
  if (lease.chequeDeliveryState !== "approved") {
    return "cheques";
  }
  if (!lease.onboardingCompletedAt) {
    return "checkin";
  }
  return "complete";
}

export type TenantPortalContext = {
  mode: TenantPortalMode;
  /** Calendar-active lease (may still be in onboarding). */
  calendarLease: ActiveLeaseForTenant | null;
  /** Same as calendar lease when onboarding is complete; otherwise null. */
  operationalLease: ActiveLeaseForTenant | null;
  onboardingStep: TenantOnboardingStep | null;
  pastLeases: PastLeaseRow[];
};

export async function getTenantPortalContext(userId: string): Promise<TenantPortalContext> {
  const [calendarLease, pastLeases] = await Promise.all([
    getActiveLeaseForTenant(userId),
    listPastLeasesForTenant(userId)
  ]);
  const operationalLease = calendarLease?.onboardingCompletedAt ? calendarLease : null;

  if (calendarLease && !calendarLease.onboardingCompletedAt) {
    return {
      mode: "onboarding",
      calendarLease,
      operationalLease: null,
      onboardingStep: deriveOnboardingStep(calendarLease),
      pastLeases
    };
  }

  if (operationalLease) {
    return {
      mode: "active",
      calendarLease,
      operationalLease,
      onboardingStep: "complete",
      pastLeases
    };
  }

  return {
    mode: "inactive",
    calendarLease: null,
    operationalLease: null,
    onboardingStep: null,
    pastLeases
  };
}
