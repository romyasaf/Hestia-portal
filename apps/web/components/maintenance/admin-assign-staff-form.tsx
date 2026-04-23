"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { assignMaintenanceTicketStaff } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type StaffOption = { id: string; fullName: string; email: string };

type Props = {
  ticketId: string;
  staff: StaffOption[];
};

export function AdminAssignStaffForm({ ticketId, staff }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [staffUserId, setStaffUserId] = useState(staff[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);

  if (staff.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No staff users found. Create a user with the <code className="font-mono">staff</code> role first.
      </p>
    );
  }

  const onAssign = (e: FormEvent) => {
    e.preventDefault();
    if (!staffUserId) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await assignMaintenanceTicketStaff({ ticketId, staffUserId });
      if (!res.ok) {
        setMessage(
          res.error === "invalid_staff"
            ? "Invalid staff user."
            : res.error === "staff_missing_maintenance_permission"
              ? "That staff login does not have maintenance permission."
              : "Assignment failed."
        );
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={onAssign} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Assign staff</h3>
      <p className="text-xs text-muted-foreground">
        Assigning from <strong>Pending Review</strong> moves the ticket to <strong>Assigned to Staff</strong>.
      </p>
      <select
        value={staffUserId}
        onChange={(e) => setStaffUserId(e.target.value)}
        className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.fullName} ({s.email})
          </option>
        ))}
      </select>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Assign"}
      </Button>
    </form>
  );
}
