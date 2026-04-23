"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkoutStatusLabel } from "@/lib/checkout/statuses";
import { updateLeaseCheckoutStatus } from "@/server/actions/checkout";
import { Button } from "@/components/ui/button";

type Props = {
  checkoutId: string;
  nextStatuses: string[];
  showAdminNotes?: boolean;
};

export function CheckoutStatusControls({ checkoutId, nextStatuses, showAdminNotes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (nextStatuses.length === 0) {
    return null;
  }

  const onMove = (nextStatus: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateLeaseCheckoutStatus({
        checkoutId,
        nextStatus,
        adminNotes: showAdminNotes ? adminNotes.trim() || null : undefined
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_transition: "That status change is not allowed.",
          use_schedule_action: "Use the schedule form to set a checkout time.",
          already_final: "This checkout is already finished.",
          forbidden: "Not allowed.",
          no_change: "Pick a different status."
        };
        setMessage(map[res.error] ?? "Update failed.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
      {showAdminNotes ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Admin notes (optional)</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      ) : null}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Update status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button key={s} type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onMove(s)}>
              {checkoutStatusLabel(s)}
            </Button>
          ))}
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
