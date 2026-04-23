"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updatePropertyOwnerFinancialAccess } from "@/server/actions/admin-entities";

type Props = { propertyId: string; initial: boolean };

export function PropertyOwnerFinancialToggle({ propertyId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={initial}
        disabled={pending}
        onChange={(e) => {
          start(async () => {
            await updatePropertyOwnerFinancialAccess({
              propertyId,
              ownerFinancialAccess: e.target.checked
            });
            router.refresh();
          });
        }}
      />
      <span>Owner portal financials</span>
    </label>
  );
}
