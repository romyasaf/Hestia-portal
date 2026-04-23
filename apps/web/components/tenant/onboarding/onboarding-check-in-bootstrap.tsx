"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { ensureOnboardingCheckinInventory } from "@/server/actions/tenant-onboarding";

export function OnboardingCheckInBootstrap({
  hasLines,
  children
}: {
  hasLines: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (hasLines || ran.current) {
      return;
    }
    ran.current = true;
    void (async () => {
      const res = await ensureOnboardingCheckinInventory();
      if (res.ok) {
        router.refresh();
      }
    })();
  }, [hasLines, router]);

  return <>{children}</>;
}
