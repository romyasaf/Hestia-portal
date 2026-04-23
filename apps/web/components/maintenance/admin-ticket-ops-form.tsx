"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { setMaintenanceApprovalNeeded, setMaintenanceInternalCost } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type Props = {
  ticketId: string;
  approvalNeeded: boolean;
  internalCost: string | null;
};

export function AdminTicketOpsForm({ ticketId, approvalNeeded, internalCost }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [approval, setApproval] = useState(approvalNeeded);
  const [cost, setCost] = useState(internalCost ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const saveApproval = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await setMaintenanceApprovalNeeded({ ticketId, approvalNeeded: approval });
      if (!res.ok) {
        setMessage("Could not update approval flag.");
        return;
      }
      router.refresh();
    });
  };

  const saveCost = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await setMaintenanceInternalCost({ ticketId, internalCost: cost || "0" });
      if (!res.ok) {
        setMessage(res.error === "invalid_amount" ? "Invalid internal cost." : "Could not save.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Admin operations</h3>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
          Tenant approval required before “Approved”
        </label>
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={saveApproval}>
          Save flag
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        When checked, you can move from <strong>Awaiting Admin Review</strong> to{" "}
        <strong>Awaiting Tenant Approval</strong>. Otherwise use <strong>Approved</strong> directly.
      </p>
      <form onSubmit={saveCost} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor="int-cost">
            Internal cost
          </label>
          <input
            id="int-cost"
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="mt-1 flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          Save cost
        </Button>
      </form>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
