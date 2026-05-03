"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import {
  createOwnerContract,
  deleteOwnerContract,
  getOwnerContractScheduleForAdmin,
  type OwnerContractScheduleRow
} from "@/server/actions/owner-contracts";
import { uploadOwnerContractDocument } from "@/server/actions/owner-contract-upload";
import { expensePaymentLabel } from "@/lib/accounting/statuses";
import {
  ownerAgreementGeneratesMonthlyExpenses,
  ownerAgreementTypeLabel,
  parseStoredOwnerAgreementType
} from "@/lib/owner/agreement-contract";
import { propertyScopeLabel } from "@/lib/owner/property-scope";
import {
  feeCalculationBasisLabel,
  formatMoneyQarForDisplay,
  formatPercentageForDisplay,
  managementFeeStructureLabel,
  parseManagementFeeStructure
} from "@/lib/owner/management-fee";
import type {
  AdminOwnerContractExpenseRow,
  AdminOwnerContractRow,
  AdminOwnerObligationSummary,
  AdminOwnerPortfolioBuilding,
  AdminOwnerPortfolioUnit
} from "@/server/queries/admin-owner-contracts";
import { Button } from "@/components/ui/button";

function previewInstallmentCount(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) {
    return null;
  }
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  let n = 0;
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth();
  for (;;) {
    if (y > endY || (y === endY && m > endM)) {
      break;
    }
    n += 1;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return n;
}

function contractAmountSummaryLine(c: AdminOwnerContractRow): string {
  const t = parseStoredOwnerAgreementType(c.contractType);
  if (t === "property_management") {
    const structure = parseManagementFeeStructure(c.managementFeeStructure);
    const bits: string[] = [];
    bits.push(managementFeeStructureLabel(c.managementFeeStructure));
    if (structure === "percentage" || structure === "hybrid") {
      bits.push(formatPercentageForDisplay(c.managementFeePercentage));
    }
    if (structure === "fixed_monthly" || structure === "hybrid") {
      bits.push(formatMoneyQarForDisplay(c.monthlyManagementFeeAmount));
    }
    bits.push(feeCalculationBasisLabel(c.revenueCalculationMethod));
    return bits.filter((b) => b && b !== "—").join(" · ") || "Property management";
  }
  if (ownerAgreementGeneratesMonthlyExpenses(t)) {
    return `${c.amount} / month`;
  }
  return `${c.amount} / month`;
}

function createContractErrorMessage(err: string): string {
  const map: Record<string, string> = {
    missing_scope: "Select a building or unit that belongs to this owner.",
    invalid_dates: "Check start and end dates.",
    invalid_amount: "Enter a positive monthly amount.",
    property_not_owned_by_party: "That building or unit is not linked to this owner.",
    unit_not_owned_by_party: "That building or unit is not linked to this owner.",
    contract_has_settled_expenses: "Cannot remove: some installments are already paid or approved.",
    schedule_too_long: "Date range is too long.",
    missing_management_fee_structure: "Select a management fee structure.",
    missing_revenue_calculation_method: "Select a revenue calculation method (gross or net basis).",
    invalid_management_percentage: "Enter a valid commission percentage (0–100).",
    invalid_monthly_management_fee: "Enter a valid monthly management fee amount."
  };
  return map[err] ?? "Could not create contract.";
}

type Props = {
  ownerUserId: string;
  contracts: AdminOwnerContractRow[];
  portfolio: { buildings: AdminOwnerPortfolioBuilding[]; units: AdminOwnerPortfolioUnit[] };
  obligationSummary: AdminOwnerObligationSummary;
  upcoming: AdminOwnerContractExpenseRow[];
  overdue: AdminOwnerContractExpenseRow[];
};

export function AdminOwnerContractsPanel({
  ownerUserId,
  contracts,
  portfolio,
  obligationSummary,
  upcoming,
  overdue
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [scopeKind, setScopeKind] = useState<"building" | "unit">("building");
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [contractType, setContractType] = useState<
    "fixed_lease" | "property_management" | "operator" | "managed"
  >("fixed_lease");
  const [managementFeeStructure, setManagementFeeStructure] = useState<
    "commission_based_fee" | "fixed_monthly_management_fee" | "hybrid_fee_structure"
  >("commission_based_fee");
  const [revenueCalculationMethod, setRevenueCalculationMethod] = useState<
    "gross_revenue_basis" | "net_revenue_basis"
  >("gross_revenue_basis");
  const [managementFeePercentage, setManagementFeePercentage] = useState("");
  const [monthlyManagementFeeAmount, setMonthlyManagementFeeAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleByContract, setScheduleByContract] = useState<Record<string, OwnerContractScheduleRow[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState<string | null>(null);

  const installmentsPreview = useMemo(
    () => previewInstallmentCount(startDate, endDate),
    [startDate, endDate]
  );

  const isPropertyManagement = parseStoredOwnerAgreementType(contractType) === "property_management";
  const needsMonthlyPayableAmount =
    ownerAgreementGeneratesMonthlyExpenses(parseStoredOwnerAgreementType(contractType)) &&
    !isPropertyManagement;

  const syncFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  const onUploadFile = async (file: File | null) => {
    if (!file || file.size === 0) {
      setDocumentUrl(null);
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("ownerUserId", ownerUserId);
      fd.set("file", file);
      const res = await uploadOwnerContractDocument(fd);
      if (!res.ok) {
        setMessage(
          res.error === "file_too_large"
            ? "File is too large (max 12 MB)."
            : res.error === "invalid_type"
              ? "Use PDF, JPEG, PNG, or WebP."
              : "Upload failed."
        );
        setDocumentUrl(null);
        return;
      }
      setDocumentUrl(res.url);
    } catch {
      setMessage("Upload failed.");
      setDocumentUrl(null);
    }
    setUploading(false);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (isPropertyManagement) {
        if (
          managementFeeStructure === "commission_based_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const p = Number.parseFloat(managementFeePercentage);
          if (!Number.isFinite(p) || p <= 0 || p > 100) {
            setMessage("Enter a valid commission percentage (0–100).");
            setBusy(false);
            return;
          }
        }
        if (
          managementFeeStructure === "fixed_monthly_management_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const m = Number.parseFloat(monthlyManagementFeeAmount);
          if (!Number.isFinite(m) || m <= 0) {
            setMessage("Enter a valid monthly management fee amount.");
            setBusy(false);
            return;
          }
        }
      } else if (needsMonthlyPayableAmount) {
        const a = Number.parseFloat(amount);
        if (!Number.isFinite(a) || a <= 0) {
          setMessage("Enter a positive monthly amount.");
          setBusy(false);
          return;
        }
      }

      const res = await createOwnerContract({
        ownerUserId,
        propertyId: scopeKind === "building" ? propertyId || undefined : undefined,
        unitId: scopeKind === "unit" ? unitId || undefined : undefined,
        contractType,
        startDate,
        endDate,
        paymentFrequency: "monthly",
        amount: isPropertyManagement ? "0" : amount,
        documentUrl: documentUrl ?? undefined,
        notes: notes.trim() || undefined,
        ...(isPropertyManagement
          ? {
              managementFeeStructure,
              revenueCalculationMethod,
              managementFeePercentage,
              monthlyManagementFeeAmount
            }
          : {})
      });
      if (!res.ok) {
        setMessage(createContractErrorMessage(res.error));
        setBusy(false);
        return;
      }
      setPropertyId("");
      setUnitId("");
      setStartDate("");
      setEndDate("");
      setAmount("");
      setManagementFeePercentage("");
      setMonthlyManagementFeeAmount("");
      setNotes("");
      setDocumentUrl(null);
      setMessage(
        isPropertyManagement
          ? "Contract saved."
          : "Contract saved. Monthly expenses were generated in Finance when a payable amount applies."
      );
      syncFromServer();
    } catch {
      setMessage("Could not create contract.");
    }
    setBusy(false);
  };

  const onDelete = async (contractId: string) => {
    if (!window.confirm("Delete this owner contract? Pending installments will be removed. Paid or approved rows block deletion.")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await deleteOwnerContract({ contractId });
      if (!res.ok) {
        setMessage(
          res.error === "contract_has_settled_expenses"
            ? "Some installments are paid or approved — void or adjust them in Finance first."
            : "Could not delete contract."
        );
        setBusy(false);
        return;
      }
      syncFromServer();
    } catch {
      setMessage("Could not delete contract.");
    }
    setBusy(false);
  };

  const toggleSchedule = async (contractId: string) => {
    if (expandedId === contractId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contractId);
    if (scheduleByContract[contractId]) {
      return;
    }
    setScheduleLoading(contractId);
    try {
      const res = await getOwnerContractScheduleForAdmin({ contractId, ownerUserId });
      if (res.ok) {
        setScheduleByContract((m) => ({ ...m, [contractId]: res.rows }));
      } else {
        setMessage("Could not load payment schedule.");
      }
    } finally {
      setScheduleLoading(null);
    }
  };

  const canCreate = portfolio.buildings.length > 0 || portfolio.units.length > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Linked portfolio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner contracts can only reference buildings or units where this person is recorded as owner.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Buildings</h3>
            {portfolio.buildings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None assigned.</p>
            ) : (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {portfolio.buildings.map((b) => (
                  <li key={b.id}>
                    <span className="font-mono text-xs">{b.code}</span> · {b.name}
                    <span className="block pl-5 text-xs text-muted-foreground">{b.formattedAddress}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">Units</h3>
            {portfolio.units.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None assigned.</p>
            ) : (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {portfolio.units.map((u) => (
                  <li key={u.id}>
                    <span className="font-mono text-xs">{u.propertyCode}</span> · Unit {u.unitNumber} · {u.propertyName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Financial obligations (from contracts)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fixed-lease / operator agreements create scheduled expenses (<span className="font-mono text-xs">owner_payouts</span> ·{" "}
          <span className="font-mono text-xs">fixed_lease_payment</span>). Property-management agreements also create fee receipts in
          Finance. Mark payouts in{" "}
          <Link href="/admin/finance" className="text-primary hover:underline">
            Finance
          </Link>
          .
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending installments</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{obligationSummary.pendingCount}</dd>
            <dd className="text-xs text-muted-foreground">{obligationSummary.pendingAmount} total</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Upcoming (today onward)</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{obligationSummary.upcomingCount}</dd>
            <dd className="text-xs text-muted-foreground">{obligationSummary.upcomingAmount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue (still open)</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-destructive">{obligationSummary.overdueCount}</dd>
            <dd className="text-xs text-muted-foreground">{obligationSummary.overdueAmount}</dd>
          </div>
        </dl>
      </section>

      {(overdue.length > 0 || upcoming.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {overdue.length > 0 ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <h3 className="text-sm font-semibold text-destructive">Overdue installments</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {overdue.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                    <span>
                      {r.expenseDate} · {r.buildingLine}
                    </span>
                    <span className="font-mono tabular-nums">{r.amount}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/admin/expenses">Open expenses</Link>
              </Button>
            </div>
          ) : null}
          {upcoming.length > 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-6">
              <h3 className="text-sm font-semibold">Upcoming installments</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                    <span>
                      {r.expenseDate} · {r.buildingLine}
                    </span>
                    <span className="font-mono tabular-nums">{r.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Owner contracts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Company agreements with this owner (fixed lease, property management, or legacy types). Separate from tenant
          leases. Agreements with a positive monthly payable generate one pending expense per calendar month through the
          end date; property management uses fee terms only (no flat installment schedule from this amount).
        </p>

        {contracts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No contracts yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {contracts.map((c) => (
              <li key={c.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {propertyScopeLabel(c.propertyScope)} · {ownerAgreementTypeLabel(c.contractType)} ·{" "}
                      {contractAmountSummaryLine(c)} · {c.startDate} →{" "}
                      {c.endDate}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.unit
                        ? `${c.unit.property.code} · Unit ${c.unit.unitNumber} · ${c.unit.property.name}`
                        : c.property
                          ? `${c.property.code} · ${c.property.name}`
                          : "—"}
                    </p>
                    {c.coveredUnitsSummary ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Units covered: <span className="font-medium text-foreground">{c.coveredUnitsSummary}</span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">{c.expenseCount} generated installments</p>
                    {c.documentUrl ? (
                      <a
                        href={c.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-primary hover:underline"
                      >
                        Contract document
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void toggleSchedule(c.id)}>
                      {expandedId === c.id ? "Hide schedule" : "Payment schedule"}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void onDelete(c.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {expandedId === c.id ? (
                  <div className="mt-3 max-h-56 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                    {scheduleLoading === c.id ? (
                      <p className="text-muted-foreground">Loading…</p>
                    ) : (
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="py-1 pr-2 font-medium">Date</th>
                            <th className="py-1 pr-2 font-medium">Amount</th>
                            <th className="py-1 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(scheduleByContract[c.id] ?? []).map((s) => (
                            <tr key={s.id} className="border-b border-border/60">
                              <td className="py-1 pr-2 font-mono">{s.expenseDate}</td>
                              <td className="py-1 pr-2 font-mono tabular-nums">{s.amount}</td>
                              <td className="py-1">{expensePaymentLabel(s.paymentStatus)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-base font-semibold">New contract</h3>
          {!canCreate ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Assign this person as owner on at least one building or unit before creating a contract.
            </p>
          ) : (
            <form onSubmit={(e) => void onCreate(e)} className="mt-4 max-w-xl space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    checked={scopeKind === "building"}
                    onChange={() => setScopeKind("building")}
                    disabled={busy || portfolio.buildings.length === 0}
                  />
                  Whole building
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    checked={scopeKind === "unit"}
                    onChange={() => setScopeKind("unit")}
                    disabled={busy || portfolio.units.length === 0}
                  />
                  Single unit
                </label>
              </div>
              {scopeKind === "building" ? (
                <div>
                  <label className="text-sm font-medium">Building</label>
                  <select
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Select…</option>
                    {portfolio.buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Select…</option>
                    {portfolio.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.propertyCode} · Unit {u.unitNumber} · {u.propertyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Agreement type</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={contractType}
                  onChange={(e) =>
                    setContractType(
                      e.target.value as "fixed_lease" | "property_management" | "operator" | "managed"
                    )
                  }
                  disabled={busy}
                >
                  <option value="fixed_lease">Fixed lease</option>
                  <option value="property_management">Property management</option>
                  <option value="operator">Operator (legacy)</option>
                  <option value="managed">Managed (legacy)</option>
                </select>
              </div>
              {isPropertyManagement ? (
                <div className="space-y-4 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
                  <div>
                    <label className="text-sm font-medium">Management fee structure</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={managementFeeStructure}
                      onChange={(e) =>
                        setManagementFeeStructure(
                          e.target.value as
                            | "commission_based_fee"
                            | "fixed_monthly_management_fee"
                            | "hybrid_fee_structure"
                        )
                      }
                      disabled={busy}
                    >
                      <option value="commission_based_fee">Commission-Based Fee</option>
                      <option value="fixed_monthly_management_fee">Fixed Monthly Management Fee</option>
                      <option value="hybrid_fee_structure">Hybrid Fee Structure</option>
                    </select>
                  </div>
                  {(managementFeeStructure === "commission_based_fee" ||
                    managementFeeStructure === "hybrid_fee_structure") && (
                    <div>
                      <label className="text-sm font-medium">Commission Percentage %</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="0.01"
                        required
                        placeholder="e.g. 10"
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={managementFeePercentage}
                        onChange={(e) => setManagementFeePercentage(e.target.value)}
                        disabled={busy}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Example: enter 10 for a 10% commission.</p>
                    </div>
                  )}
                  {(managementFeeStructure === "fixed_monthly_management_fee" ||
                    managementFeeStructure === "hybrid_fee_structure") && (
                    <div>
                      <label className="text-sm font-medium">Monthly Management Fee Amount (QAR)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        required
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={monthlyManagementFeeAmount}
                        onChange={(e) => setMonthlyManagementFeeAmount(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Revenue calculation method</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={revenueCalculationMethod}
                      onChange={(e) =>
                        setRevenueCalculationMethod(e.target.value as "gross_revenue_basis" | "net_revenue_basis")
                      }
                      disabled={busy}
                    >
                      <option value="gross_revenue_basis">Gross Revenue Basis</option>
                      <option value="net_revenue_basis">Net Revenue Basis</option>
                    </select>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              {!isPropertyManagement ? (
                <div>
                  <label className="text-sm font-medium">Monthly amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={needsMonthlyPayableAmount}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy}
                  />
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {isPropertyManagement
                  ? "Property management contracts do not create recurring installments from a flat monthly payable here."
                  : `Payment frequency is monthly. Preview: ${
                      installmentsPreview == null ? "—" : `${installmentsPreview} installment(s) will be created.`
                    }`}
              </p>
              <div>
                <label className="text-sm font-medium">Contract document (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="mt-1 block w-full text-sm"
                  disabled={busy || uploading}
                  onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
                />
                {documentUrl ? <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Uploaded.</p> : null}
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={busy}
                />
              </div>
              {message ? (
                <p
                  className={
                    message.includes("saved") || message.includes("Uploaded")
                      ? "text-sm text-emerald-700 dark:text-emerald-400"
                      : "text-sm text-destructive"
                  }
                >
                  {message}
                </p>
              ) : null}
              <Button type="submit" disabled={busy || uploading}>
                {busy ? "Saving…" : "Create contract & generate expenses"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
