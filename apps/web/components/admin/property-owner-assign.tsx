"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { assignPropertyOwner } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type OwnerOpt = { id: string; label: string };

export function PropertyOwnerAssign({
  propertyId,
  currentOwnerUserId,
  ownerOptions
}: {
  propertyId: string;
  currentOwnerUserId: string | null;
  ownerOptions: OwnerOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ownerUserId, setOwnerUserId] = useState(currentOwnerUserId ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setOwnerUserId(currentOwnerUserId ?? "");
  }, [currentOwnerUserId]);

  if (ownerOptions.length === 0) {
    return (
      <p className="max-w-[14rem] text-xs text-muted-foreground">
        No owner accounts yet.{" "}
        <a href="/admin/owners/new" className="font-medium text-primary hover:underline">
          Create owner
        </a>
      </p>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await assignPropertyOwner({
            propertyId,
            ownerUserId: ownerUserId.trim() === "" ? null : ownerUserId.trim()
          });
          if (!res.ok) {
            setMsg(res.error === "owner_must_have_role" ? "User needs owner role." : "Update failed.");
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="sr-only" htmlFor={`owner-${propertyId}`}>
        Building-level owner
      </label>
      <select
        id={`owner-${propertyId}`}
        className="h-9 min-w-[11rem] rounded-md border border-input bg-background px-2 text-xs"
        value={ownerUserId}
        onChange={(e) => setOwnerUserId(e.target.value)}
      >
        <option value="">— None —</option>
        {ownerOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="h-9 text-xs">
        {pending ? "…" : "Save"}
      </Button>
      {msg ? <span className="w-full text-xs text-destructive">{msg}</span> : null}
    </form>
  );
}
