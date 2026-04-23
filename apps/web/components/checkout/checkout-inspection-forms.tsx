"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { completeLeaseCheckout, saveLeaseCheckoutInspection } from "@/server/actions/checkout";
import { Button } from "@/components/ui/button";

type InspectionProps = {
  checkoutId: string;
  status: string;
  initialOutcome?: string | null;
  initialDamages?: string | null;
  initialDeduction?: string | null;
  initialDepositReturn?: string | null;
};

export function CheckoutInspectionForm({
  checkoutId,
  status,
  initialOutcome,
  initialDamages,
  initialDeduction,
  initialDepositReturn
}: InspectionProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [outcome, setOutcome] = useState(initialOutcome ?? "");
  const [damages, setDamages] = useState(initialDamages ?? "");
  const [deduction, setDeduction] = useState(initialDeduction ?? "");
  const [depositReturn, setDepositReturn] = useState(initialDepositReturn ?? "");

  const st = status.toLowerCase();
  if (st !== "scheduled" && st !== "inspected") {
    return null;
  }

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await saveLeaseCheckoutInspection({
        checkoutId,
        inspectionOutcome: outcome,
        damagesSummary: damages || null,
        deductionAmount: deduction || null,
        depositReturnAmount: depositReturn || null
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          missing_outcome: "Inspection outcome is required.",
          wrong_status_for_inspection: "Checkout must be scheduled or already inspected.",
          invalid_deduction: "Invalid deduction amount.",
          invalid_deposit_return: "Invalid deposit return amount."
        };
        setMsg(map[res.error] ?? "Could not save inspection.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSave} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-sm font-semibold">Move-out inspection</h2>
      <p className="text-xs text-muted-foreground">
        Record outcome and financials. Saving from <strong>Scheduled</strong> marks the checkout as{" "}
        <strong>Inspected</strong>.
      </p>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Outcome</label>
        <select
          required
          className="mt-1 flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          <option value="">Select…</option>
          <option value="pass">Pass — no material issues</option>
          <option value="minor">Minor wear</option>
          <option value="major">Major damage / repairs needed</option>
          <option value="dispute">Dispute / legal review</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Damages / notes</label>
        <textarea
          value={damages}
          onChange={(e) => setDamages(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Deduction (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Deposit return (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={depositReturn}
            onChange={(e) => setDepositReturn(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : st === "scheduled" ? "Save inspection & mark inspected" : "Update inspection"}
      </Button>
    </form>
  );
}

type CompleteProps = { checkoutId: string; status: string };

export function CheckoutCompleteForm({ checkoutId, status }: CompleteProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (status.toLowerCase() !== "inspected") {
    return null;
  }

  const onComplete = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await completeLeaseCheckout({
        checkoutId,
        adminNotes: note || undefined
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          must_inspect_first: "Complete inspection before closing.",
          missing_outcome: "Inspection outcome is required."
        };
        setMsg(map[res.error] ?? "Could not complete checkout.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={onComplete} className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-6">
      <h2 className="text-sm font-semibold">Finalize checkout</h2>
      <p className="text-xs text-muted-foreground">Closes the workflow and stamps completion time.</p>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Closing note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Completing…" : "Mark checkout completed"}
      </Button>
    </form>
  );
}
