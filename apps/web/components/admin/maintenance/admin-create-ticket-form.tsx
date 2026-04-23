"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createAdminMaintenanceTicket } from "@/server/actions/maintenance";
import type { AdminActiveLeaseOption } from "@/server/queries/leases-admin";
import { Button } from "@/components/ui/button";

const priorities = ["low", "medium", "high", "urgent"] as const;

type Props = {
  leases: AdminActiveLeaseOption[];
};

export function AdminCreateMaintenanceTicketForm({ leases }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [leaseId, setLeaseId] = useState(leases[0]?.leaseId ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<string>("medium");
  const [description, setDescription] = useState("");
  const [permissionToEnter, setPermissionToEnter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!leaseId) {
      setMessage("Select an active lease.");
      return;
    }
    startTransition(async () => {
      const res = await createAdminMaintenanceTicket({
        leaseId,
        title,
        category,
        priority,
        description: description || undefined,
        permissionToEnter
      });
      if (!res.ok) {
        if (res.error === "not_found") {
          setMessage("Lease not found.");
        } else if (res.error === "not_active") {
          setMessage("That lease is not active for today’s date.");
        } else if (res.error === "missing_fields") {
          setMessage("Title and category are required.");
        } else if (res.error === "forbidden" || res.error === "unauthorized") {
          setMessage("You do not have permission to create tickets.");
        } else {
          setMessage("Could not create ticket. Try again.");
        }
        return;
      }
      setTitle("");
      setDescription("");
      router.refresh();
    });
  };

  if (leases.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground sm:p-6">
        <p className="font-medium text-foreground">No active leases</p>
        <p className="mt-2">There are no calendar-active leases to attach a maintenance ticket to.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">Create ticket for tenant</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Opens in <strong>Pending Review</strong>. The ticket is linked to the selected lease and unit;{" "}
        <span className="font-medium text-foreground">opened by</span> is your admin account for audit.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="adm-lease">
            Lease / tenant
          </label>
          <select
            id="adm-lease"
            required
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {leases.map((l) => (
              <option key={l.leaseId} value={l.leaseId}>
                {l.propertyName} · Unit {l.unitNumber} · {l.tenantName} ({l.tenantEmail}) · {l.startDate} →{" "}
                {l.endDate}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="adm-title">
            Title
          </label>
          <input
            id="adm-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="adm-cat">
            Category
          </label>
          <input
            id="adm-cat"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="adm-pri">
            Priority
          </label>
          <select
            id="adm-pri"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={permissionToEnter}
              onChange={(e) => setPermissionToEnter(e.target.checked)}
            />
            Tenant permits entry if not home
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="adm-desc">
            Description
          </label>
          <textarea
            id="adm-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create ticket"}
      </Button>
    </form>
  );
}
