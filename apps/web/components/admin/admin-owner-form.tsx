"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { createOwnerWithContract } from "@/server/actions/create-owner-with-contract";
import { Button } from "@/components/ui/button";

export type BuildingWithUnitsOpt = {
  id: string;
  label: string;
  propertyType: string;
  units: { id: string; unitNumber: string }[];
};

function ownerCreateErrorMessage(err: string): string {
  const map: Record<string, string> = {
    email_in_use: "That email is already in use.",
    weak_or_missing_password: "Email and a password of at least 8 characters are required.",
    missing_name: "Name is required.",
    missing_phone: "Phone is required.",
    missing_qid: "QID number is required.",
    missing_cr: "CR number is required.",
    missing_property: "Choose a building or location for this owner agreement.",
    missing_property_scope: "Select where this agreement applies (whole building, specific units, or whole villa).",
    invalid_property_scope: "Property scope does not match the selected building or units.",
    invalid_villa_property: "Whole villa scope requires a property whose type is set to Villa (edit the building in Portfolio).",
    missing_units: "Select at least one unit when the scope is specific unit(s).",
    invalid_units: "One or more selected units are not valid — refresh and try again.",
    unit_property_mismatch: "Selected units must belong to the chosen building.",
    unit_already_assigned: "A selected unit already has an owner assigned. Remove it from the other owner first.",
    missing_contract_file: "Attach the contract document.",
    missing_fixed_lease_amount: "Fixed lease amount is required for fixed lease agreements.",
    missing_management_fee_structure: "Select a management fee structure.",
    missing_revenue_calculation_method: "Select a revenue calculation method (gross or net basis).",
    invalid_management_percentage: "Enter a valid commission percentage (0–100).",
    invalid_monthly_management_fee: "Enter a valid monthly management fee amount.",
    invalid_contract_dates: "Contract end date must be on or after the start date.",
    invalid_file_type: "Contract must be PDF, JPEG, PNG, or WebP.",
    file_too_large: "File is too large (max 12 MB).",
    no_owner_role: "Owner role missing in database (run role seeds).",
    invalid_property: "Selected building is not valid — refresh and try again.",
    database_schema_outdated:
      "Database is missing required tables. Apply migrations (owner_profiles, owner_contracts 017–023), then try again."
  };
  if (err === "no_schedule" || err === "schedule_too_long") {
    return "Invalid contract period for a payment schedule.";
  }
  return map[err] ?? "Could not create owner. Check all fields and try again.";
}

export function AdminOwnerForm({ buildings }: { buildings: BuildingWithUnitsOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [ownerType, setOwnerType] = useState<"individual" | "company">("individual");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [qidNumber, setQidNumber] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [propertyScope, setPropertyScope] = useState<"whole_building" | "specific_units" | "whole_villa">(
    "whole_building"
  );
  const [buildingManagementStatus, setBuildingManagementStatus] = useState<
    "managed_by_hestia" | "location_only_not_managed"
  >("managed_by_hestia");
  const [propertyId, setPropertyId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [contractType, setContractType] = useState<"fixed_lease" | "property_management">("property_management");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [fixedLeaseAmount, setFixedLeaseAmount] = useState("");
  const [managementFeeStructure, setManagementFeeStructure] = useState<
    "commission_based_fee" | "fixed_monthly_management_fee" | "hybrid_fee_structure"
  >("commission_based_fee");
  const [revenueCalculationMethod, setRevenueCalculationMethod] = useState<
    "gross_revenue_basis" | "net_revenue_basis"
  >("gross_revenue_basis");
  const [managementFeePercentage, setManagementFeePercentage] = useState("");
  const [monthlyManagementFeeAmount, setMonthlyManagementFeeAmount] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);

  const nameLabel = ownerType === "company" ? "Company name" : "Full name";

  const selectedBuilding = useMemo(() => buildings.find((x) => x.id === propertyId), [buildings, propertyId]);
  const unitsForProperty = useMemo(() => selectedBuilding?.units ?? [], [selectedBuilding]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => (prev.includes(unitId) ? prev.filter((x) => x !== unitId) : [...prev, unitId]));
  };

  useEffect(() => {
    if (propertyScope === "specific_units") {
      setBuildingManagementStatus("location_only_not_managed");
    } else {
      setBuildingManagementStatus("managed_by_hestia");
    }
  }, [propertyScope]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        return;
      }
      if (!phone.trim()) {
        setMessage("Phone is required.");
        return;
      }
      if (!propertyId) {
        setMessage("Select an owned property (building).");
        return;
      }
      if (propertyScope === "specific_units") {
        if (selectedUnitIds.length === 0) {
          setMessage("Select at least one unit covered by this agreement.");
          return;
        }
      }
      if (propertyScope === "whole_villa") {
        if (selectedBuilding?.propertyType?.trim().toLowerCase() !== "villa") {
          setMessage("Whole villa scope only applies when the selected property type is Villa.");
          return;
        }
      }
      if (ownerType === "individual" && !qidNumber.trim()) {
        setMessage("QID number is required for individual owners.");
        return;
      }
      if (ownerType === "company" && !crNumber.trim()) {
        setMessage("Commercial registration (CR) number is required for company owners.");
        return;
      }
      if (!contractFile) {
        setMessage("Attach the signed contract PDF or image.");
        return;
      }
      if (!contractStartDate || !contractEndDate) {
        setMessage("Contract start and end dates are required.");
        return;
      }
      if (contractType === "fixed_lease") {
        const n = Number.parseFloat(fixedLeaseAmount);
        if (!Number.isFinite(n) || n <= 0) {
          setMessage("Enter a valid fixed lease amount (greater than zero).");
          return;
        }
      }
      if (contractType === "property_management") {
        if (
          managementFeeStructure === "commission_based_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const p = Number.parseFloat(managementFeePercentage);
          if (!Number.isFinite(p) || p <= 0 || p > 100) {
            setMessage("Enter a valid commission percentage (greater than 0 and at most 100).");
            return;
          }
        }
        if (
          managementFeeStructure === "fixed_monthly_management_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const m = Number.parseFloat(monthlyManagementFeeAmount);
          if (!Number.isFinite(m) || m <= 0) {
            setMessage("Enter a valid monthly management fee amount (greater than zero).");
            return;
          }
        }
      }

      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("fullName", fullName);
      fd.set("phone", phone);
      fd.set("ownerType", ownerType);
      fd.set("qidNumber", qidNumber);
      fd.set("crNumber", crNumber);
      fd.set("propertyId", propertyId);
      fd.set("propertyScope", propertyScope);
      fd.set("buildingManagementStatus", buildingManagementStatus);
      if (propertyScope === "specific_units") {
        for (const uid of selectedUnitIds) {
          fd.append("unitId", uid);
        }
      }
      fd.set("contractType", contractType);
      fd.set("contractStartDate", contractStartDate);
      fd.set("contractEndDate", contractEndDate);
      fd.set("fixedLeaseAmount", fixedLeaseAmount);
      fd.set("managementFeeStructure", managementFeeStructure);
      fd.set("revenueCalculationMethod", revenueCalculationMethod);
      fd.set("managementFeePercentage", managementFeePercentage);
      fd.set("monthlyManagementFeeAmount", monthlyManagementFeeAmount);
      fd.set("contractFile", contractFile);

      const res = await createOwnerWithContract(fd);
      if (!res.ok) {
        setMessage(ownerCreateErrorMessage(res.error));
        return;
      }
      router.push("/admin/owners");
      router.refresh();
    });
  };

  const sectionClass =
    "space-y-4 rounded-xl border border-border bg-card/60 p-6 shadow-sm";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      <div className={sectionClass}>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Owner information</h2>
        <p className="text-sm text-muted-foreground">
          Creates a portal login with the <strong className="text-foreground">owner</strong> role. An owner agreement
          is required — property scope and agreement type drive finance automation.
        </p>
        <div>
          <label className="text-sm font-medium">Owner type</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as "individual" | "company")}
          >
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">{nameLabel}</label>
          <input
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Initial password</label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters. Owner can change it after login.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Identification</h2>
        {ownerType === "individual" ? (
          <div>
            <label className="text-sm font-medium">QID number</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={qidNumber}
              onChange={(e) => setQidNumber(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Qatar ID for the individual owner.</p>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium">Commercial registration (CR) number</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Property scope</h2>
        <p className="text-sm text-muted-foreground">
          Where this agreement applies — separate from agreement type (fixed lease vs property management).
        </p>
        <div className="mt-4">
          <label className="text-sm font-medium">Scope</label>
          <select
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={propertyScope}
            onChange={(e) => {
              const v = e.target.value as "whole_building" | "specific_units" | "whole_villa";
              setPropertyScope(v);
              setSelectedUnitIds([]);
            }}
          >
            <option value="whole_building">Whole building</option>
            <option value="specific_units">Specific unit(s)</option>
            <option value="whole_villa">Whole villa</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Whole building / villa: Hestia&apos;s contract covers the full asset. Specific units: only selected units
            — the building may be a location container only.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Building / location</label>
          <select
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setSelectedUnitIds([]);
            }}
          >
            <option value="">— Select building —</option>
            {buildings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {buildings.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No buildings yet.{" "}
              <a href="/admin/properties/new" className="font-medium text-primary hover:underline">
                Create a building
              </a>{" "}
              first.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              For specific units, this record is the container for locating units; set building management status below.
            </p>
          )}
        </div>
        {propertyScope === "specific_units" ? (
          <div>
            <label className="text-sm font-medium">Building management status</label>
            <select
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={buildingManagementStatus}
              onChange={(e) =>
                setBuildingManagementStatus(e.target.value as "managed_by_hestia" | "location_only_not_managed")
              }
            >
              <option value="location_only_not_managed">Not managed by Hestia / location only</option>
              <option value="managed_by_hestia">Managed by Hestia</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Use &quot;location only&quot; when Hestia only manages selected units, not the whole tower.
            </p>
          </div>
        ) : null}
        {propertyScope === "specific_units" ? (
          <div>
            <label className="text-sm font-medium">Units covered</label>
            {propertyId && unitsForProperty.length > 0 ? (
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 text-sm">
                {unitsForProperty.map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUnitIds.includes(u.id)}
                        onChange={() => toggleUnit(u.id)}
                      />
                      <span>
                        Unit <span className="font-medium">{u.unitNumber}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {propertyId ? "This building has no units yet." : "Select a building to list its units."}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Select all units this person owns in this building.</p>
          </div>
        ) : null}
      </div>

      <div className={sectionClass}>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Contract information</h2>
        <div>
          <label className="text-sm font-medium">Agreement type</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={contractType}
            onChange={(e) => setContractType(e.target.value as "fixed_lease" | "property_management")}
          >
            <option value="property_management">Property management agreement</option>
            <option value="fixed_lease">Fixed lease agreement</option>
          </select>
        </div>

        {contractType === "property_management" ? (
          <div className="mt-6 space-y-4 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financial terms</p>
            <div>
              <label className="text-sm font-medium">Management fee structure</label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={managementFeeStructure}
                onChange={(e) =>
                  setManagementFeeStructure(
                    e.target.value as "commission_based_fee" | "fixed_monthly_management_fee" | "hybrid_fee_structure"
                  )
                }
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
              >
                <option value="gross_revenue_basis">Gross Revenue Basis</option>
                <option value="net_revenue_basis">Net Revenue Basis</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <label className="text-sm font-medium">Contract attachment</label>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            required
            className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted-foreground">PDF or image, up to 12 MB. Required before the owner can be saved.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Contract start date</label>
            <input
              type="date"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contract end date</label>
            <input
              type="date"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
            />
          </div>
        </div>
        {contractType === "fixed_lease" ? (
          <div className="mt-6">
            <label className="text-sm font-medium">Fixed lease amount (QAR)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fixedLeaseAmount}
              onChange={(e) => setFixedLeaseAmount(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Monthly liability to the owner for the contract term; drives scheduled payables.
            </p>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending} className="min-w-[160px]">
        {pending ? "Creating…" : "Create owner & agreement"}
      </Button>
    </form>
  );
}
