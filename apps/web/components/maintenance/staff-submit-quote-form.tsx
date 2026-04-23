"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { submitMaintenanceQuote } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type Props = { ticketId: string; currentStatus: string };

export function StaffSubmitQuoteForm({ ticketId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (currentStatus !== "Assigned to Staff") {
    return null;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await submitMaintenanceQuote({
        ticketId,
        quoteDescription: desc,
        quotedAmount: amount || undefined,
        approvalNeededSuggestion: approvalNeeded
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          not_assignee: "Only the assignee can submit the quote.",
          wrong_status_for_quote: "Quote can only be submitted while assigned to staff.",
          missing_quote_description: "Describe the quote / scope.",
          invalid_quote_amount: "Invalid amount.",
          forbidden: "Not allowed."
        };
        setMessage(map[res.error] ?? "Could not submit quote.");
        return;
      }
      setDesc("");
      setAmount("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Submit quote for admin review</h3>
      <p className="text-xs text-muted-foreground">
        Sends the ticket to <strong>Awaiting Admin Review</strong>. Staff cannot use the status buttons for that step
        unless an admin overrides—use this form.
      </p>
      <div>
        <label className="text-sm font-medium" htmlFor="quote-desc">
          Quote / scope description
        </label>
        <textarea
          id="quote-desc"
          required
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="quote-amt">
          Quoted amount (optional)
        </label>
        <input
          id="quote-amt"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={approvalNeeded} onChange={(e) => setApprovalNeeded(e.target.checked)} />
        Suggest tenant approval step
      </label>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Submitting…" : "Submit quote"}
      </Button>
    </form>
  );
}
