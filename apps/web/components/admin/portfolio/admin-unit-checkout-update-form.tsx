"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateLeaseCheckOut } from "@/server/actions/admin-lease-checkout";
import { Button } from "@/components/ui/button";

export function AdminUnitCheckoutUpdateForm({ checkOutId }: { checkOutId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [finalDecisionNotes, setFinalDecision] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await updateLeaseCheckOut({
        checkOutId,
        inspectionNotes: inspectionNotes || undefined,
        finalDecisionNotes: finalDecisionNotes || undefined
      });
      if (!res.ok) {
        setMsg("Could not save.");
        return;
      }
      setMsg("Saved.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded border border-dashed border-border/80 bg-background/50 p-3 text-xs">
      <p className="font-medium text-foreground">Update inspection / decision (admin)</p>
      <label className="grid gap-1 text-muted-foreground">
        Inspection notes
        <textarea
          className="min-h-[64px] rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          value={inspectionNotes}
          onChange={(e) => setInspectionNotes(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-muted-foreground">
        Final decision notes
        <textarea
          className="min-h-[64px] rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          value={finalDecisionNotes}
          onChange={(e) => setFinalDecision(e.target.value)}
        />
      </label>
      {msg ? (
        <p className={msg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>{msg}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save checkout updates"}
      </Button>
    </form>
  );
}
