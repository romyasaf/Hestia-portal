"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { tenantBookChequeAppointment, tenantMarkChequesDelivered } from "@/server/actions/tenant-onboarding";
import { Button } from "@/components/ui/button";

export function TenantChequesStepForm({
  state,
  canBook,
  canMarkDelivered
}: {
  state: string;
  canBook: boolean;
  canMarkDelivered: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [at, setAt] = useState("");
  const [notes, setNotes] = useState("");

  const st = state.toLowerCase();

  if (st === "approved") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <p className="font-medium text-foreground">Cheques confirmed</p>
        <p className="mt-2 text-muted-foreground">Continue to apartment check-in.</p>
        <Button asChild className="mt-4">
          <Link href="/tenant/onboarding/check-in">Go to check-in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {st === "marked_delivered" ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/25">
          <p className="font-medium text-foreground">Waiting for office confirmation</p>
          <p className="mt-1 text-muted-foreground">
            A manager must confirm cheque receipt before you can open the check-in checklist.
          </p>
        </div>
      ) : null}

      {canBook ? (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(null);
            start(async () => {
              const iso = at.trim() ? new Date(at).toISOString() : "";
              const res = await tenantBookChequeAppointment({
                appointmentAt: iso,
                notes: notes.trim() || undefined
              });
              if (!res.ok) {
                setMsg(res.error === "invalid_date" ? "Pick a valid date and time." : "Could not save appointment.");
                return;
              }
              router.refresh();
            });
          }}
        >
          <h2 className="text-sm font-semibold">Book an appointment</h2>
          <p className="text-xs text-muted-foreground">Choose when you will bring cheques to the office.</p>
          <input
            type="datetime-local"
            required
            className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
          <textarea
            className="mt-2 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Notes for the team (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save appointment"}
          </Button>
        </form>
      ) : null}

      {canMarkDelivered ? (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(null);
            start(async () => {
              const res = await tenantMarkChequesDelivered();
              if (!res.ok) {
                setMsg("Could not update status.");
                return;
              }
              router.refresh();
            });
          }}
        >
          <h2 className="text-sm font-semibold">Already delivered cheques?</h2>
          <p className="text-xs text-muted-foreground">
            If you already handed cheques to the office, mark them here. A manager will confirm before you continue.
          </p>
          {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Mark cheques as delivered"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
