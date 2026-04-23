"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateMaintenanceTicketStatus } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type Props = {
  ticketId: string;
  /** Next statuses the current viewer is allowed to apply (computed on server). */
  nextStatuses: string[];
  currentStatus: string;
};

export function TicketStatusControls({ ticketId, nextStatuses, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [schedulingFor, setSchedulingFor] = useState(false);
  const [appointmentAt, setAppointmentAt] = useState("");

  if (nextStatuses.length === 0) {
    return null;
  }

  const onMove = (toStatus: string) => {
    setMessage(null);
    if (toStatus === "Scheduled" && currentStatus === "Awaiting Scheduling") {
      setSchedulingFor(true);
      return;
    }
    startTransition(async () => {
      const res = await updateMaintenanceTicketStatus({ ticketId, toStatus });
      if (!res.ok) {
        setMessage(mapError(res.error));
        return;
      }
      router.refresh();
    });
  };

  const confirmScheduled = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateMaintenanceTicketStatus({
        ticketId,
        toStatus: "Scheduled",
        appointmentAt: appointmentAt.trim() ? new Date(appointmentAt).toISOString() : undefined
      });
      if (!res.ok) {
        setMessage(mapError(res.error));
        return;
      }
      setSchedulingFor(false);
      setAppointmentAt("");
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Update status</h3>
      <p className="mt-1 text-xs text-muted-foreground">Allowed transitions for your role.</p>
      {schedulingFor ? (
        <div className="mt-4 space-y-3 rounded-md border border-input bg-muted/30 p-3">
          <p className="text-sm font-medium">Set appointment for Scheduled</p>
          <input
            type="datetime-local"
            value={appointmentAt}
            onChange={(e) => setAppointmentAt(e.target.value)}
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={confirmScheduled}>
              Confirm scheduled
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSchedulingFor(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button key={s} type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onMove(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}
      {message ? <p className="mt-2 text-sm text-destructive">{message}</p> : null}
    </div>
  );
}

function mapError(code: string): string {
  const map: Record<string, string> = {
    invalid_transition: "That status change is not allowed.",
    not_assignee: "Only the assigned staff member can update this ticket.",
    tenant_cancel_own_only: "You can only cancel tickets you opened.",
    already_terminal: "This ticket is already closed.",
    forbidden: "You are not allowed to update this ticket.",
    quote_required: "A staff quote (description or amount) is required before admin review.",
    approval_not_flagged: 'Turn on “Tenant approval required” before sending to tenant approval.',
    appointment_required: "Choose an appointment date and time for Scheduled.",
    invalid_appointment: "Invalid appointment date."
  };
  return map[code] ?? "Update failed.";
}
