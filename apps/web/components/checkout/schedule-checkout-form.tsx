"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { scheduleLeaseCheckout } from "@/server/actions/checkout";
import { Button } from "@/components/ui/button";

type Props = { checkoutId: string };

export function ScheduleCheckoutForm({ checkoutId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!scheduledAt) {
      setMessage("Choose a date and time.");
      return;
    }
    const at = new Date(scheduledAt);
    if (Number.isNaN(at.getTime())) {
      setMessage("Invalid date/time.");
      return;
    }
    startTransition(async () => {
      const res = await scheduleLeaseCheckout({
        checkoutId,
        scheduledAt: at.toISOString()
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          not_schedulable: "Checkout must be in “requested” state to schedule.",
          invalid_datetime: "Invalid date/time.",
          forbidden: "Not allowed."
        };
        setMessage(map[res.error] ?? "Could not schedule.");
        return;
      }
      setScheduledAt("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Schedule walkthrough / checkout</h3>
      <p className="text-xs text-muted-foreground">Set when the team will meet the tenant for checkout.</p>
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className="mt-1 flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </form>
  );
}
