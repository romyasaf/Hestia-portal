"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { OnboardingInventoryLine } from "@/lib/tenant-lifecycle/inventory-template";
import {
  completeOnboardingCheckIn,
  saveOnboardingInventoryDraft
} from "@/server/actions/tenant-onboarding";
import { Button } from "@/components/ui/button";

export function TenantOnboardingCheckInForm({ initialLines }: { initialLines: OnboardingInventoryLine[] }) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  const setAck = (id: string, ack: "confirmed" | "issue") => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ack } : l)));
  };

  const setIssue = (id: string, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, issueSummary: text } : l)));
  };

  const setTenantNotes = (id: string, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, tenantNotes: text } : l)));
  };

  const saveDraft = () => {
    setMsg(null);
    start(async () => {
      const res = await saveOnboardingInventoryDraft(lines);
      if (!res.ok) {
        setMsg("Could not save draft.");
        return;
      }
      router.refresh();
    });
  };

  const submit = () => {
    setMsg(null);
    start(async () => {
      const res = await completeOnboardingCheckIn({ tenantNotes: notes.trim() || undefined });
      if (!res.ok) {
        setMsg(
          res.error === "incomplete_inventory"
            ? "Confirm every line (OK or issue) before submitting."
            : res.error === "issue_needs_summary"
              ? "Add a short description for each issue."
              : res.error === "empty_inventory"
                ? "Checklist is still loading — try again in a moment."
                : "Could not submit check-in."
        );
        return;
      }
      router.push("/tenant/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        For each item, review the expected condition, add optional notes, then choose <strong>OK</strong> or{" "}
        <strong>Issue</strong>. Issues are recorded only during this check-in; after you finish, use maintenance for new
        problems.
      </p>
      <ul className="space-y-4">
        {lines.map((line) => (
          <li key={line.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium text-foreground">{line.label}</p>
            {line.defaultCondition ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Condition: </span>
                {line.defaultCondition}
              </p>
            ) : null}
            {line.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Notes: </span>
                {line.notes}
              </p>
            ) : null}
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Your notes (optional)</label>
            <textarea
              className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Anything specific about this item at move-in"
              value={line.tenantNotes ?? ""}
              onChange={(e) => setTenantNotes(line.id, e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={line.ack === "confirmed" ? "default" : "outline"}
                onClick={() => setAck(line.id, "confirmed")}
              >
                OK
              </Button>
              <Button
                type="button"
                size="sm"
                variant={line.ack === "issue" ? "default" : "outline"}
                onClick={() => setAck(line.id, "issue")}
              >
                Issue
              </Button>
            </div>
            {line.ack === "issue" ? (
              <textarea
                className="mt-2 min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe the issue"
                value={line.issueSummary ?? ""}
                onChange={(e) => setIssue(line.id, e.target.value)}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <div>
        <label className="text-sm font-medium" htmlFor="ci-notes">
          General notes (optional)
        </label>
        <textarea
          id="ci-notes"
          className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={saveDraft} disabled={pending}>
          Save progress
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Submitting…" : "Submit check-in & finish move-in"}
        </Button>
      </div>
    </div>
  );
}
