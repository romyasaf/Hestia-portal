"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { requestLeaseCheckout } from "@/server/actions/checkout";
import { Button } from "@/components/ui/button";

export function RequestCheckoutForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tenantNotes, setTenantNotes] = useState("");
  const [preferredMoveOutDate, setPreferredMoveOutDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await requestLeaseCheckout({
        tenantNotes: tenantNotes.trim() || undefined,
        preferredMoveOutDate: preferredMoveOutDate.trim() || undefined
      });
      if (!res.ok) {
        if (res.error === "no_active_lease") {
          setMessage("You need an active lease to request checkout.");
        } else if (res.error === "open_checkout_exists") {
          setMessage("You already have a checkout in progress for this lease.");
        } else if (res.error === "invalid_date") {
          setMessage("Preferred move-out date is invalid.");
        } else {
          setMessage("Could not submit checkout request.");
        }
        return;
      }
      setTenantNotes("");
      setPreferredMoveOutDate("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">Request checkout</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Tell us when you plan to leave. The office will confirm and schedule a walkthrough if needed.
      </p>
      <div>
        <label className="text-sm font-medium" htmlFor="co-pref">
          Preferred move-out date
        </label>
        <input
          id="co-pref"
          type="date"
          value={preferredMoveOutDate}
          onChange={(e) => setPreferredMoveOutDate(e.target.value)}
          className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="co-notes">
          Notes for the office
        </label>
        <textarea
          id="co-notes"
          value={tenantNotes}
          onChange={(e) => setTenantNotes(e.target.value)}
          rows={3}
          placeholder="Forwarding address, handover questions…"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit checkout request"}
      </Button>
    </form>
  );
}
