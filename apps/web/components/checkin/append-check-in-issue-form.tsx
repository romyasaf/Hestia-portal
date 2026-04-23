"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { appendLeaseCheckInIssue } from "@/server/actions/checkin";
import { CHECKIN_SEVERITY_OPTIONS } from "@/lib/checkin/severities";
import { Button } from "@/components/ui/button";

type Props = { checkInId: string };

export function AppendCheckInIssueForm({ checkInId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [areaLabel, setAreaLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await appendLeaseCheckInIssue({
        checkInId,
        summary,
        details: details || undefined,
        severity,
        areaLabel: areaLabel || undefined
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          missing_summary: "Enter a short summary for the issue.",
          cannot_add_issue: "Issues can only be logged while the check-in is submitted or under review.",
          forbidden: "You cannot add issues to this check-in."
        };
        setMessage(map[res.error] ?? "Could not add issue.");
        return;
      }
      setSummary("");
      setDetails("");
      setSeverity("medium");
      setAreaLabel("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Log another issue</h3>
      <input
        required
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Issue summary"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        placeholder="Details (optional)"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">Severity</label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {CHECKIN_SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Area / room</label>
          <input
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add issue"}
      </Button>
    </form>
  );
}
