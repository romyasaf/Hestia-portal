"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { createLease, updateLease } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type TenantOpt = { id: string; label: string };

/** Mirrors server `AdminLeaseUnitOption` — keep in sync for client bundle. */
type LeaseUnitFormOption = {
  id: string;
  label: string;
  buildingLine: string;
  resolvedOwnerLine: string;
  ownerSource: "unit" | "building" | "none";
};

type Props = {
  tenants: TenantOpt[];
  units: LeaseUnitFormOption[];
  leaseId?: string;
  initial?: {
    unitId: string;
    tenantUserId: string;
    startDate: string;
    endDate: string;
    rentAmount: string;
    depositAmount: string;
    status: string;
  };
};

function leaseErrorMessage(code: string): string {
  switch (code) {
    case "missing_lease_links":
      return "Choose both a unit and a tenant.";
    case "invalid_unit":
      return "Selected unit is not valid.";
    case "invalid_tenant":
      return "Selected tenant is not valid.";
    case "invalid_rent":
      return "Enter a valid rent amount.";
    case "invalid_dates":
      return "Check start and end dates (end must be on or after start).";
    default:
      return "Could not save lease. Check dates, amounts, and selections.";
  }
}

export function AdminLeaseForm({ tenants, units, leaseId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(initial?.unitId ?? units[0]?.id ?? "");
  const [tenantUserId, setTenantUserId] = useState(initial?.tenantUserId ?? tenants[0]?.id ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount ?? "");
  const [depositAmount, setDepositAmount] = useState(initial?.depositAmount ?? "0");
  const [status, setStatus] = useState(initial?.status ?? "active");

  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = leaseId
        ? await updateLease({
            leaseId,
            unitId,
            tenantUserId,
            startDate,
            endDate,
            rentAmount,
            depositAmount,
            status
          })
        : await createLease({
            unitId,
            tenantUserId,
            startDate,
            endDate,
            rentAmount,
            depositAmount,
            status
          });
      if (!res.ok) {
        setMessage(leaseErrorMessage(res.error));
        return;
      }
      router.push("/admin/leases");
      router.refresh();
    });
  };

  if (units.length === 0 || tenants.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        {units.length === 0 ? (
          <p>
            No units in the portfolio yet. Create a building, add units, then create a lease linking a unit and tenant.
          </p>
        ) : null}
        {tenants.length === 0 ? <p>Create at least one tenant user before adding a lease.</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Unit</label>
        <select
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Building and resolved owner follow the unit (direct unit owner, else building owner, else unassigned).
        </p>
      </div>

      {selectedUnit ? (
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Derived from this unit</p>
          <dl className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Building</dt>
              <dd className="font-medium text-foreground">{selectedUnit.buildingLine}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Resolved owner</dt>
              <dd className="font-medium text-foreground">{selectedUnit.resolvedOwnerLine}</dd>
            </div>
          </dl>
          {selectedUnit.ownerSource === "none" ? (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
              No owner is assigned at unit or building level yet. You can still save the lease; assign owners for
              reporting and owner portal access.
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium">Tenant</label>
        <select
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={tenantUserId}
          onChange={(e) => setTenantUserId(e.target.value)}
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Start</label>
          <input
            type="date"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">End</label>
          <input
            type="date"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Rent</label>
          <input
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Deposit</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["draft", "active", "expired", "terminated", "renewal_pending"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {leaseId ? "Save lease" : "Create lease"}
      </Button>
    </form>
  );
}
