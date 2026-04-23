"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { submitLeaseCheckIn } from "@/server/actions/checkin";
import { CHECKIN_SEVERITY_OPTIONS } from "@/lib/checkin/severities";
import { Button } from "@/components/ui/button";

type IssueRow = { summary: string; details: string; severity: string; areaLabel: string };

export function SubmitCheckInForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tenantNotes, setTenantNotes] = useState("");
  const [issues, setIssues] = useState<IssueRow[]>([
    { summary: "", details: "", severity: "medium", areaLabel: "" }
  ]);
  const [message, setMessage] = useState<string | null>(null);

  const addRow = () =>
    setIssues((prev) => [...prev, { summary: "", details: "", severity: "medium", areaLabel: "" }]);
  const removeRow = (idx: number) => setIssues((prev) => prev.filter((_, i) => i !== idx));
  const setIssue = (idx: number, patch: Partial<IssueRow>) =>
    setIssues((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const payload = issues
      .map((r) => ({
        summary: r.summary.trim(),
        details: r.details.trim() || undefined,
        severity: r.severity,
        areaLabel: r.areaLabel.trim() || undefined
      }))
      .filter((r) => r.summary.length > 0);
    startTransition(async () => {
      const res = await submitLeaseCheckIn({
        tenantNotes: tenantNotes.trim() || undefined,
        issues: payload
      });
      if (!res.ok) {
        if (res.error === "no_active_lease") {
          setMessage("You need an active lease to submit a check-in.");
        } else if (res.error === "open_check_in_exists") {
          setMessage("You already have an open check-in for this lease. Finish or cancel it before starting another.");
        } else {
          setMessage("Could not submit check-in. Try again.");
        }
        return;
      }
      setTenantNotes("");
      setIssues([{ summary: "", details: "", severity: "medium", areaLabel: "" }]);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">New check-in</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Document the unit at move-in. You can list issues (marks on walls, missing items, etc.) and add more later
        while the office reviews your submission.
      </p>
      <div>
        <label className="text-sm font-medium" htmlFor="ci-notes">
          General notes
        </label>
        <textarea
          id="ci-notes"
          value={tenantNotes}
          onChange={(e) => setTenantNotes(e.target.value)}
          rows={3}
          placeholder="Overall condition, meter readings, keys received…"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Issues (optional)</span>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            Add issue row
          </Button>
        </div>
        {issues.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex justify-end">
              {issues.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              value={row.summary}
              onChange={(e) => setIssue(idx, { summary: e.target.value })}
              placeholder="Short issue title"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={row.details}
              onChange={(e) => setIssue(idx, { details: e.target.value })}
              rows={2}
              placeholder="Details (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Severity</label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={row.severity}
                  onChange={(e) => setIssue(idx, { severity: e.target.value })}
                >
                  {CHECKIN_SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Area / room (optional)</label>
                <input
                  value={row.areaLabel}
                  onChange={(e) => setIssue(idx, { areaLabel: e.target.value })}
                  placeholder="e.g. Kitchen"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit check-in"}
      </Button>
    </form>
  );
}
