"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updatePropertyOwnerContractType } from "@/server/actions/admin-entities";

type Contract = "operator" | "managed";

export function PropertyOwnerContractSelect({
  propertyId,
  ownerUserId,
  ownerContractType
}: {
  propertyId: string;
  ownerUserId: string | null;
  ownerContractType: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState<Contract>(ownerContractType === "operator" ? "operator" : "managed");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setValue(ownerContractType === "operator" ? "operator" : "managed");
  }, [ownerContractType, ownerUserId]);

  if (!ownerUserId) {
    return <p className="text-xs text-muted-foreground">Assign a building-level owner to set contract type.</p>;
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await updatePropertyOwnerContractType({ propertyId, ownerContractType: value });
          if (!res.ok) {
            setMsg(res.error === "owner_required_for_contract" ? "Owner required." : "Update failed.");
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="sr-only" htmlFor={`contract-${propertyId}`}>
        Owner contract
      </label>
      <select
        id={`contract-${propertyId}`}
        className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value as Contract)}
      >
        <option value="managed">Managed</option>
        <option value="operator">Operator (fixed lease)</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted"
      >
        {pending ? "…" : "Save type"}
      </button>
      {msg ? <span className="w-full text-xs text-destructive">{msg}</span> : null}
    </form>
  );
}
