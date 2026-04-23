"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkInStatusLabel } from "@/lib/checkin/statuses";
import { updateLeaseCheckInStatus } from "@/server/actions/checkin";
import { Button } from "@/components/ui/button";

type Props = {
  checkInId: string;
  nextStatuses: string[];
  /** When false, only status buttons (e.g. tenant cancel). */
  adminNotesEnabled?: boolean;
};

export function CheckInReviewControls({ checkInId, nextStatuses, adminNotesEnabled = true }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onMove = (nextStatus: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateLeaseCheckInStatus({
        checkInId,
        nextStatus,
        adminNotes: adminNotesEnabled ? adminNotes.trim() || null : undefined
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_transition: "That status change is not allowed.",
          already_final: "This check-in is already closed.",
          forbidden: "Not allowed.",
          no_change: "Pick a different status."
        };
        setMessage(map[res.error] ?? "Update failed.");
        return;
      }
      router.refresh();
    });
  };

  if (nextStatuses.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
      {adminNotesEnabled ? (
        <div>
          <h3 className="text-sm font-semibold">Admin review</h3>
          <p className="mt-1 text-xs text-muted-foreground">Optional notes visible to the tenant on next load.</p>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Internal or tenant-facing notes…"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <h3 className="text-sm font-semibold">Update status</h3>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{adminNotesEnabled ? "Change status" : "Actions"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button key={s} type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onMove(s)}>
              {checkInStatusLabel(s)}
            </Button>
          ))}
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
