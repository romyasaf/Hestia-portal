import { redirect } from "next/navigation";
import { requireTenantOnboardingLease, onboardingPathForStep } from "@/server/tenant-portal/require-onboarding";

export default async function TenantOnboardingIndexPage() {
  const { step } = await requireTenantOnboardingLease();
  redirect(onboardingPathForStep(step));
}
