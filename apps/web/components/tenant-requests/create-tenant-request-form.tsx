"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { TENANT_REQUEST_KINDS, tenantRequestKindLabel } from "@/lib/tenant-requests/statuses";
import { createTenantRequest } from "@/server/actions/tenant-requests";
import { Button } from "@/components/ui/button";

export function CreateTenantRequestForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<string>(TENANT_REQUEST_KINDS[0]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createTenantRequest({
        kind,
        title,
        details: details || undefined
      });
      if (!res.ok) {
        if (res.error === "no_active_lease") {
          setMessage("You need an active lease before submitting a request.");
        } else if (res.error === "missing_title") {
          setMessage("Title is required.");
        } else if (res.error === "forbidden" || res.error === "unauthorized") {
          setMessage("You are not allowed to submit this type of request.");
        } else {
          setMessage("Could not create request. Try again.");
        }
        return;
      }
      setTitle("");
      setDetails("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">New request</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Choose renewal, transfer, or handover. The office will review and update the status here.
      </p>
      <div>
        <label className="text-sm font-medium" htmlFor="tr-kind">
          Request type
        </label>
        <select
          id="tr-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TENANT_REQUEST_KINDS.map((k) => (
            <option key={k} value={k}>
              {tenantRequestKindLabel(k)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="tr-title">
          Title
        </label>
        <input
          id="tr-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary for the team"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="tr-details">
          Details (optional)
        </label>
        <textarea
          id="tr-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          placeholder="Dates, parties, access notes, or other context"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
