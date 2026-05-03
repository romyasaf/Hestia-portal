"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveLeaseChequeDelivery } from "@/server/actions/admin-lease-onboarding";
import { chequeDeliveryLabel } from "@/lib/tenant-lifecycle/cheque-states";
import { Button } from "@/components/ui/button";

export function AdminLeaseChequePanel({
  leaseId,
  chequeDeliveryState,
  chequeMarkedDeliveredAt,
  chequeApprovedAt,
  chequeReceivedAt,
  onboardingCompletedAt
}: {
  leaseId: string;
  chequeDeliveryState: string;
  chequeMarkedDeliveredAt: string | null;
  chequeApprovedAt: string | null;
  chequeReceivedAt: string | null;
  onboardingCompletedAt: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const st = chequeDeliveryState.trim().toLowerCase();

  if (onboardingCompletedAt) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Tenant onboarding is complete for this lease.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="text-base font-semibold">Move-in · cheque delivery</h2>
      <p className="mt-2 text-muted-foreground">Status: {chequeDeliveryLabel(st)}</p>
      {chequeMarkedDeliveredAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Tenant marked delivered: {new Date(chequeMarkedDeliveredAt).toLocaleString()}
        </p>
      ) : null}
      {chequeApprovedAt ? (
        <p className="mt-1 text-xs text-emerald-700">Approved: {new Date(chequeApprovedAt).toLocaleString()}</p>
      ) : null}
      {chequeReceivedAt ? (
        <p className="mt-1 text-xs text-muted-foreground">Received (record): {new Date(chequeReceivedAt).toLocaleString()}</p>
      ) : null}
      {st === "marked_delivered" ? (
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              setMsg(null);
              start(async () => {
                const res = await approveLeaseChequeDelivery({ leaseId });
                if (!res.ok) {
                  setMsg(res.error === "not_awaiting_approval" ? "Not waiting on approval." : "Could not approve.");
                  return;
                }
                router.refresh();
              });
            }}
          >
            {pending ? "…" : "Confirm cheque receipt"}
          </Button>
          {msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          When the tenant marks cheques as delivered, confirm receipt here so they can continue to check-in.
        </p>
      )}
    </div>
  );
}
