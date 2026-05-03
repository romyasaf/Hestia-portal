"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { createLease, updateLease } from "@/server/actions/admin-entities";
import { uploadLeaseContractDocument } from "@/server/actions/lease-document-upload";
import { CHEQUE_DELIVERY_STATES } from "@/lib/tenant-lifecycle/cheque-states";
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

export type AdminLeaseFormInitial = {
  unitId: string;
  tenantUserId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  status: string;
  paymentFrequency?: string;
  digitalSignatureStatus?: string;
  unsignedContractDocumentUrl?: string | null;
  signedContractDocumentUrl?: string | null;
  chequeDeliveryState?: string;
  /** `YYYY-MM-DD` for date input */
  chequeAppointmentDate?: string;
  chequeAppointmentNotes?: string | null;
  onboardingContractSigned?: boolean;
  onboardingChequeReceived?: boolean;
  onboardingCheckinCompleted?: boolean;
};

type Props = {
  tenants: TenantOpt[];
  units: LeaseUnitFormOption[];
  leaseId?: string;
  initial?: AdminLeaseFormInitial;
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
    case "invalid_cheque_appointment":
      return "Cheque appointment date is invalid.";
    case "lease_unit_active_overlap":
      return "This unit already has an active lease overlapping these dates.";
    default:
      return "Could not save lease. Check dates, amounts, and selections.";
  }
}

export function AdminLeaseForm({ tenants, units, leaseId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploadBusy, setUploadBusy] = useState<"unsigned" | "signed" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(initial?.unitId ?? units[0]?.id ?? "");
  const [tenantUserId, setTenantUserId] = useState(initial?.tenantUserId ?? tenants[0]?.id ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount ?? "");
  const [depositAmount, setDepositAmount] = useState(initial?.depositAmount ?? "0");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [paymentFrequency, setPaymentFrequency] = useState(initial?.paymentFrequency ?? "monthly");
  const [digitalSignatureStatus, setDigitalSignatureStatus] = useState(initial?.digitalSignatureStatus ?? "none");
  const [unsignedContractDocumentUrl, setUnsignedContractDocumentUrl] = useState(
    initial?.unsignedContractDocumentUrl?.trim() ?? ""
  );
  const [signedContractDocumentUrl, setSignedContractDocumentUrl] = useState(
    initial?.signedContractDocumentUrl?.trim() ?? ""
  );
  const [chequeDeliveryState, setChequeDeliveryState] = useState(
    (initial?.chequeDeliveryState ?? "pending").toLowerCase()
  );
  const [chequeAppointmentDate, setChequeAppointmentDate] = useState(initial?.chequeAppointmentDate ?? "");
  const [chequeAppointmentNotes, setChequeAppointmentNotes] = useState(initial?.chequeAppointmentNotes ?? "");
  const [onboardingContractSigned, setOnboardingContractSigned] = useState(
    Boolean(initial?.onboardingContractSigned)
  );
  const [onboardingChequeReceived, setOnboardingChequeReceived] = useState(Boolean(initial?.onboardingChequeReceived));
  const [onboardingCheckinCompleted, setOnboardingCheckinCompleted] = useState(
    Boolean(initial?.onboardingCheckinCompleted)
  );

  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const base = {
        unitId,
        tenantUserId,
        startDate,
        endDate,
        rentAmount,
        depositAmount,
        status,
        paymentFrequency
      };
      const res = leaseId
        ? await updateLease({
            leaseId,
            ...base,
            digitalSignatureStatus,
            unsignedContractDocumentUrl,
            signedContractDocumentUrl,
            chequeDeliveryState,
            chequeAppointmentAt: chequeAppointmentDate,
            chequeAppointmentNotes,
            onboardingContractSigned,
            onboardingChequeReceived,
            onboardingCheckinCompleted
          })
        : await createLease({
            ...base
          });
      if (!res.ok) {
        setMessage(leaseErrorMessage(res.error));
        return;
      }
      router.push("/admin/leases");
      router.refresh();
    });
  };

  const uploadDoc = async (kind: "unsigned_contract" | "signed_contract", file: File | null) => {
    if (!leaseId || !file) return;
    setMessage(null);
    setUploadBusy(kind === "unsigned_contract" ? "unsigned" : "signed");
    const fd = new FormData();
    fd.set("leaseId", leaseId);
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await uploadLeaseContractDocument(fd);
    setUploadBusy(null);
    if (!res.ok) {
      setMessage("Upload failed.");
      return;
    }
    if (kind === "unsigned_contract") {
      setUnsignedContractDocumentUrl(res.url);
    } else {
      setSignedContractDocumentUrl(res.url);
    }
    router.refresh();
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

      <div>
        <label className="text-sm font-medium">Payment frequency</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={paymentFrequency}
          onChange={(e) => setPaymentFrequency(e.target.value)}
        >
          {["monthly", "quarterly", "yearly", "weekly", "other"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {leaseId ? (
        <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Signature &amp; documents</legend>
          <div>
            <label className="text-sm font-medium">Digital signature status</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={digitalSignatureStatus}
              onChange={(e) => setDigitalSignatureStatus(e.target.value)}
            >
              <option value="none">None</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Unsigned contract URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-xs"
              value={unsignedContractDocumentUrl}
              onChange={(e) => setUnsignedContractDocumentUrl(e.target.value)}
              placeholder="/uploads/leases/… or https://…"
            />
            <div className="mt-2">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="text-xs"
                disabled={uploadBusy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void uploadDoc("unsigned_contract", f ?? null);
                }}
              />
              {uploadBusy === "unsigned" ? <span className="ml-2 text-xs text-muted-foreground">Uploading…</span> : null}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Signed contract URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-xs"
              value={signedContractDocumentUrl}
              onChange={(e) => setSignedContractDocumentUrl(e.target.value)}
              placeholder="/uploads/leases/… or https://…"
            />
            <div className="mt-2">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="text-xs"
                disabled={uploadBusy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void uploadDoc("signed_contract", f ?? null);
                }}
              />
              {uploadBusy === "signed" ? <span className="ml-2 text-xs text-muted-foreground">Uploading…</span> : null}
            </div>
          </div>
        </fieldset>
      ) : null}

      {leaseId ? (
        <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Cheque handover</legend>
          <div>
            <label className="text-sm font-medium">Cheque delivery state</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={chequeDeliveryState}
              onChange={(e) => setChequeDeliveryState(e.target.value)}
            >
              {CHEQUE_DELIVERY_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Cheque appointment (date)</label>
            <input
              type="date"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={chequeAppointmentDate}
              onChange={(e) => setChequeAppointmentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cheque appointment notes</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={chequeAppointmentNotes}
              onChange={(e) => setChequeAppointmentNotes(e.target.value)}
            />
          </div>
        </fieldset>
      ) : null}

      {leaseId ? (
        <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Onboarding checklist (admin)</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onboardingContractSigned}
              onChange={(e) => setOnboardingContractSigned(e.target.checked)}
            />
            Contract signed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onboardingChequeReceived}
              onChange={(e) => setOnboardingChequeReceived(e.target.checked)}
            />
            Cheque received
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onboardingCheckinCompleted}
              onChange={(e) => setOnboardingCheckinCompleted(e.target.checked)}
            />
            Check-in completed
          </label>
        </fieldset>
      ) : null}

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
