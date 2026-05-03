"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { completeOwnerAgreementWizard } from "@/server/actions/owner-agreement-wizard";
import { Button } from "@/components/ui/button";
import { feeCalculationBasisLabel, managementFeeStructureLabel } from "@/lib/owner/management-fee";
const STEPS = [
  "Owner information",
  "Contract information",
  "Property setup",
  "Building / property",
  "Units (if needed)",
  "Financial rules preview",
  "Review & confirm"
] as const;

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment_building: "Apartment building",
  villa: "Villa",
  compound: "Compound",
  commercial_building: "Commercial building",
  mixed_use: "Mixed use"
};

const BUILDING_MGMT_LABEL: Record<string, string> = {
  managed_by_hestia: "Managed by Hestia",
  location_only_not_managed: "Location only (not managed)"
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  property_management: "Property management",
  fixed_lease: "Fixed lease (operator)"
};

type PropertyUseSegment = "residential" | "commercial";
type PropertyStructure = "building" | "villa" | "unit" | "compound";

type PropertySetupResolved = {
  propertyScope: "whole_building" | "specific_units" | "whole_villa";
  propertyType: "apartment_building" | "villa" | "compound" | "commercial_building" | "mixed_use";
  reviewLine: string;
};

const PROPERTY_STRUCTURE_CARDS: { id: PropertyStructure; title: string; help: string }[] = [
  {
    id: "building",
    title: "Building",
    help: "Full building — agreement on the whole block (or typical office / residential building)."
  },
  {
    id: "villa",
    title: "Villa",
    help: "Villa. Residential: entire stand-alone property. Commercial: whole villa-typology or free-standing use."
  },
  {
    id: "unit",
    title: "Unit",
    help: "One or more units / tenancies only, not the whole block."
  },
  {
    id: "compound",
    title: "Compound",
    help: "A compound: whole compound under the agreement, stored as a compound in Portfolio."
  }
];

const PROPERTY_SETUP_MAP: Record<
  PropertyUseSegment,
  Record<PropertyStructure, PropertySetupResolved>
> = {
  residential: {
    building: {
      propertyScope: "whole_building",
      propertyType: "apartment_building",
      reviewLine: "Residential · building — full apartment or office block, whole-building scope"
    },
    villa: {
      propertyScope: "whole_villa",
      propertyType: "villa",
      reviewLine: "Residential · villa — entire stand-alone villa (whole-villa scope)"
    },
    unit: {
      propertyScope: "specific_units",
      propertyType: "apartment_building",
      reviewLine: "Residential · unit(s) — selected units, apartment-typed address in Portfolio"
    },
    compound: {
      propertyScope: "whole_building",
      propertyType: "compound",
      reviewLine: "Residential · compound — full compound, compound type in Portfolio"
    }
  },
  commercial: {
    building: {
      propertyScope: "whole_building",
      propertyType: "commercial_building",
      reviewLine: "Commercial · building — full commercial building, whole-building scope"
    },
    villa: {
      propertyScope: "whole_building",
      propertyType: "villa",
      reviewLine: "Commercial · villa — whole villa-typology or free-standing, villa type in Portfolio"
    },
    unit: {
      propertyScope: "specific_units",
      propertyType: "commercial_building",
      reviewLine: "Commercial · unit(s) — selected commercial unit(s) / tenancies"
    },
    compound: {
      propertyScope: "whole_building",
      propertyType: "compound",
      reviewLine: "Commercial · compound — full commercial compound, compound type in Portfolio"
    }
  }
};

function resolvePropertySetup(
  segment: PropertyUseSegment | null,
  structure: PropertyStructure | null
): PropertySetupResolved | null {
  if (segment == null || structure == null) {
    return null;
  }
  return PROPERTY_SETUP_MAP[segment][structure];
}

function wizardErrorMessage(err: string): string {
  const map: Record<string, string> = {
    weak_or_missing_password: "Use a valid email and password (8+ characters).",
    missing_name: "Name is required.",
    missing_phone: "Phone is required.",
    missing_qid: "QID number is required for individual owners.",
    missing_cr: "CR number is required for company owners.",
    missing_property_scope: "Select a property scope.",
    missing_units: "Add at least one unit when scope is specific unit(s).",
    invalid_contract_type: "Select a contract type.",
    missing_contract_file: "Attach the contract document.",
    missing_fixed_lease_amount: "Enter a valid fixed lease amount.",
    missing_building_fields: "Fill in building name, city, zone, street, and building number.",
    invalid_property_type: "Select a valid property type.",
    invalid_villa_property: "Whole villa scope requires property type Villa.",
    invalid_units_json: "Unit list is invalid — try again.",
    duplicate_unit_numbers: "Unit numbers must be unique.",
    invalid_unit_number: "A unit number is too long.",
    invalid_unit_bedrooms: "Enter a valid number of bedrooms (0–20) for each unit, or leave it blank.",
    invalid_unit_bathrooms: "Enter a valid number of bathrooms (0–20) for each unit, or leave it blank.",
    invalid_unit_rent: "Enter a valid monthly rent (0 or more) for each unit, or leave it blank.",
    invalid_unit_floor: "A floor value is too long.",
    invalid_unit_type: "A unit type is too long.",
    duplicate_code: "That building code is already in use.",
    code_alloc_failed: "Could not generate a unique building code.",
    email_in_use: "That email is already in use.",
    invalid_contract_dates: "Contract end date must be on or after the start date.",
    invalid_file_type: "Contract must be PDF, JPEG, PNG, or WebP.",
    file_too_large: "File is too large (max 12 MB).",
    field_too_long: "A field is too long.",
    no_schedule: "Invalid contract period for schedules.",
    schedule_too_long: "Contract period is too long for automated schedules.",
    missing_management_fee_structure: "Select a management fee structure.",
    missing_revenue_calculation_method: "Select gross or net revenue basis.",
    invalid_management_percentage: "Enter a valid commission percentage (0–100).",
    invalid_monthly_management_fee: "Enter a valid monthly management fee.",
    prisma_known:
      "The database rejected this save (often a missing migration or CHECK constraint). See technical detail below.",
    prisma_validation: "Database validation failed. See technical detail below.",
    unexpected: "Something went wrong while saving. See technical detail below."
  };
  return map[err] ?? "Could not complete the wizard. Check all fields and try again.";
}

const UNIT_STR_MAX = 64;

function newUnitLine(): {
  id: string;
  unitNumber: string;
  unitType: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
} {
  return {
    id:
      typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    unitNumber: "",
    unitType: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    monthlyRent: ""
  };
}

export function OwnerAgreementWizardForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [ownerType, setOwnerType] = useState<"individual" | "company">("individual");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [qidNumber, setQidNumber] = useState("");
  const [crNumber, setCrNumber] = useState("");

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

  const [useSegment, setUseSegment] = useState<PropertyUseSegment | null>(null);
  const [useStructure, setUseStructure] = useState<PropertyStructure | null>(null);
  const [buildingManagementStatus, setBuildingManagementStatus] = useState<
    "managed_by_hestia" | "location_only_not_managed"
  >("managed_by_hestia");

  const [buildingCode, setBuildingCode] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [buildingCity, setBuildingCity] = useState("Doha");
  const [buildingZone, setBuildingZone] = useState("");
  const [buildingStreet, setBuildingStreet] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [buildingAreaName, setBuildingAreaName] = useState("");
  const [buildingNotes, setBuildingNotes] = useState("");
  const [buildingMapsUrl, setBuildingMapsUrl] = useState("");

  const propertySetup = useMemo(
    () => resolvePropertySetup(useSegment, useStructure),
    [useSegment, useStructure]
  );
  const propertyScope = propertySetup?.propertyScope ?? "whole_building";
  const propertyType = propertySetup?.propertyType ?? "apartment_building";

  const [unitLines, setUnitLines] = useState(() => [newUnitLine()]);
  const [ownerFinancialAccess, setOwnerFinancialAccess] = useState(false);

  const unitsPayload = useMemo(() => {
    return unitLines
      .map((r) => {
        const unitNumber = r.unitNumber.trim();
        if (!unitNumber) {
          return null;
        }
        const row: {
          unitNumber: string;
          unitType?: string;
          floor?: string;
          bedrooms?: number;
          bathrooms?: number;
          monthlyRent?: string;
        } = { unitNumber };
        if (r.unitType.trim()) {
          row.unitType = r.unitType.trim();
        }
        if (r.floor.trim()) {
          row.floor = r.floor.trim();
        }
        if (r.bedrooms.trim()) {
          const b = Number.parseInt(r.bedrooms, 10);
          if (Number.isFinite(b) && b >= 0 && b <= 20) {
            row.bedrooms = b;
          }
        }
        if (r.bathrooms.trim()) {
          const b = Number.parseInt(r.bathrooms, 10);
          if (Number.isFinite(b) && b >= 0 && b <= 20) {
            row.bathrooms = b;
          }
        }
        if (r.monthlyRent.trim()) {
          row.monthlyRent = r.monthlyRent.trim();
        }
        return row;
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [unitLines]);

  useEffect(() => {
    if (propertyScope === "specific_units") {
      setBuildingManagementStatus("location_only_not_managed");
    } else {
      setBuildingManagementStatus("managed_by_hestia");
    }
  }, [propertyScope]);

  const financialPreview = useMemo(() => {
    if (contractType === "fixed_lease") {
      return `Fixed lease: ${fixedLeaseAmount || "—"} / month (creates scheduled expenses when applicable).`;
    }
    const parts: string[] = [`Management fee: ${managementFeeStructure.replace(/_/g, " ")}`];
    if (managementFeeStructure === "commission_based_fee" || managementFeeStructure === "hybrid_fee_structure") {
      parts.push(`Commission: ${managementFeePercentage || "—"}%`);
      parts.push(`Basis: ${revenueCalculationMethod.replace(/_/g, " ")}`);
    }
    if (
      managementFeeStructure === "fixed_monthly_management_fee" ||
      managementFeeStructure === "hybrid_fee_structure"
    ) {
      parts.push(`Monthly fee: ${monthlyManagementFeeAmount || "—"}`);
    }
    return parts.join(" · ");
  }, [
    contractType,
    fixedLeaseAmount,
    managementFeePercentage,
    managementFeeStructure,
    monthlyManagementFeeAmount,
    revenueCalculationMethod
  ]);

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return Boolean(email.trim() && password.length >= 8 && fullName.trim() && phone.trim());
      case 1:
        if (!contractStartDate || !contractEndDate) {
          return false;
        }
        if (!contractFile) {
          return false;
        }
        if (contractType === "fixed_lease") {
          const n = Number.parseFloat(fixedLeaseAmount);
          return Number.isFinite(n) && n > 0;
        }
        if (
          managementFeeStructure === "commission_based_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const p = Number.parseFloat(managementFeePercentage);
          if (!Number.isFinite(p) || p <= 0 || p > 100) {
            return false;
          }
        }
        if (
          managementFeeStructure === "fixed_monthly_management_fee" ||
          managementFeeStructure === "hybrid_fee_structure"
        ) {
          const m = Number.parseFloat(monthlyManagementFeeAmount);
          return Number.isFinite(m) && m > 0;
        }
        return true;
      case 2:
        return propertySetup != null;
      case 3: {
        if (
          !(
            buildingName.trim() &&
            buildingCity.trim() &&
            buildingZone.trim() &&
            buildingStreet.trim() &&
            buildingNumber.trim()
          )
        ) {
          return false;
        }
        return true;
      }
      case 4:
        if (propertyScope === "specific_units") {
          return unitsPayload.length > 0;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const contractFileSummary = useMemo(() => {
    if (!contractFile) {
      return "No file selected";
    }
    const kb = contractFile.size / 1024;
    const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
    return `${contractFile.name} · ${sizeLabel}`;
  }, [contractFile]);

  const goNext = () => {
    setMessage(null);
    setErrorDetail(null);
    if (!canNext()) {
      setMessage("Complete the required fields on this step before continuing.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setMessage(null);
    setErrorDetail(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorDetail(null);
    if (!contractFile) {
      setMessage("Attach the contract file on step 2 (Contract information).");
      return;
    }
    if (!email.trim() || password.length < 8 || !fullName.trim() || !phone.trim()) {
      setMessage("Owner information is incomplete — go back to step 1.");
      return;
    }
    if (!contractStartDate || !contractEndDate) {
      setMessage("Contract dates are missing — go back to step 2.");
      return;
    }
    if (!buildingName.trim() || !buildingCity.trim() || !buildingZone.trim() || !buildingStreet.trim() || !buildingNumber.trim()) {
      setMessage("Building address is incomplete — go back to step 4.");
      return;
    }
    if (propertyScope === "specific_units" && unitsPayload.length === 0) {
      setMessage("Add at least one unit — go back to step 5.");
      return;
    }
    if (!propertySetup) {
      setMessage("Complete property setup (residential or commercial, then building type) — go back to that step.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("fullName", fullName);
      fd.set("phone", phone);
      fd.set("ownerType", ownerType);
      fd.set("qidNumber", qidNumber);
      fd.set("crNumber", crNumber);
      fd.set("propertyScope", propertySetup.propertyScope);
      fd.set("buildingManagementStatus", buildingManagementStatus);
      fd.set("contractType", contractType);
      fd.set("contractStartDate", contractStartDate);
      fd.set("contractEndDate", contractEndDate);
      fd.set("fixedLeaseAmount", fixedLeaseAmount);
      fd.set("managementFeeStructure", managementFeeStructure);
      fd.set("revenueCalculationMethod", revenueCalculationMethod);
      fd.set("managementFeePercentage", managementFeePercentage);
      fd.set("monthlyManagementFeeAmount", monthlyManagementFeeAmount);
      fd.set("contractFile", contractFile);
      fd.set("unitsJson", JSON.stringify(unitsPayload));
      fd.set("buildingCode", buildingCode.trim());
      fd.set("buildingName", buildingName.trim());
      fd.set("buildingCity", buildingCity.trim());
      fd.set("buildingZone", buildingZone.trim());
      fd.set("buildingStreet", buildingStreet.trim());
      fd.set("buildingNumber", buildingNumber.trim());
      fd.set("buildingAreaName", buildingAreaName.trim());
      fd.set("buildingNotes", buildingNotes.trim());
      fd.set("buildingMapsUrl", buildingMapsUrl.trim());
      fd.set("propertyType", propertySetup.propertyType);
      fd.set("ownerFinancialAccess", ownerFinancialAccess ? "true" : "false");

      const res = await completeOwnerAgreementWizard(fd);
      if (!res.ok) {
        setMessage(wizardErrorMessage(res.error));
        setErrorDetail(typeof res.detail === "string" ? res.detail : null);
        return;
      }
      router.push(`/admin/owners/${res.userId}`);
      router.refresh();
    });
  };

  const nameLabel = ownerType === "company" ? "Company name" : "Full name";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={
              i === step
                ? "rounded-full bg-foreground px-3 py-1 font-medium text-background"
                : i < step
                  ? "rounded-full bg-muted px-3 py-1"
                  : "rounded-full border border-border px-3 py-1"
            }
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {message ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{message}</p>
          {errorDetail ? (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background/80 p-3 text-xs text-foreground/90">
              {errorDetail}
            </pre>
          ) : null}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Owner information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">Owner type</span>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={ownerType}
                onChange={(e) => setOwnerType(e.target.value as "individual" | "company")}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">{nameLabel}</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="font-medium">Email (login)</span>
              <input
                required
                type="email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="font-medium">Password</span>
              <input
                required
                type="password"
                minLength={8}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Phone</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {ownerType === "individual" ? (
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">QID number</span>
                <input
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={qidNumber}
                  onChange={(e) => setQidNumber(e.target.value)}
                />
              </label>
            ) : (
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Commercial registration (CR)</span>
                <input
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                />
              </label>
            )}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Contract information</h2>
          <label className="text-sm">
            <span className="font-medium">Agreement type</span>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              value={contractType}
              onChange={(e) => setContractType(e.target.value as "fixed_lease" | "property_management")}
            >
              <option value="property_management">Property management</option>
              <option value="fixed_lease">Fixed lease (operator)</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">Start date</span>
              <input
                required
                type="date"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="font-medium">End date</span>
              <input
                required
                type="date"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
              />
            </label>
          </div>
          {contractType === "fixed_lease" ? (
            <label className="text-sm">
              <span className="font-medium">Fixed lease amount (monthly)</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={fixedLeaseAmount}
                onChange={(e) => setFixedLeaseAmount(e.target.value)}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <label className="text-sm">
                <span className="font-medium">Fee structure</span>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={managementFeeStructure}
                  onChange={(e) =>
                    setManagementFeeStructure(
                      e.target.value as
                        | "commission_based_fee"
                        | "fixed_monthly_management_fee"
                        | "hybrid_fee_structure"
                    )
                  }
                >
                  <option value="commission_based_fee">Commission-based</option>
                  <option value="fixed_monthly_management_fee">Fixed monthly</option>
                  <option value="hybrid_fee_structure">Hybrid</option>
                </select>
              </label>
              {(managementFeeStructure === "commission_based_fee" ||
                managementFeeStructure === "hybrid_fee_structure") && (
                <>
                  <label className="text-sm">
                    <span className="font-medium">Commission %</span>
                    <input
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                      value={managementFeePercentage}
                      onChange={(e) => setManagementFeePercentage(e.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium">Revenue basis</span>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                      value={revenueCalculationMethod}
                      onChange={(e) =>
                        setRevenueCalculationMethod(e.target.value as "gross_revenue_basis" | "net_revenue_basis")
                      }
                    >
                      <option value="gross_revenue_basis">Gross revenue</option>
                      <option value="net_revenue_basis">Net revenue</option>
                    </select>
                  </label>
                </>
              )}
              {(managementFeeStructure === "fixed_monthly_management_fee" ||
                managementFeeStructure === "hybrid_fee_structure") && (
                <label className="text-sm">
                  <span className="font-medium">Monthly management fee</span>
                  <input
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                    value={monthlyManagementFeeAmount}
                    onChange={(e) => setMonthlyManagementFeeAmount(e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
          <label className="text-sm">
            <span className="font-medium">Signed contract file</span>
            <input
              required
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="mt-1 w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setContractFile(f);
              }}
            />
            {contractFile ? (
              <p className="mt-2 text-xs text-muted-foreground">Selected: {contractFileSummary}</p>
            ) : null}
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Property setup</h2>
          <p className="text-sm text-muted-foreground">
            First choose the use, then the property form. Together they set the agreement scope and the Portfolio
            property type. The next step is only the name and address.
          </p>

          <div>
            <h3 className="text-sm font-medium">1. Residential or commercial</h3>
            <p className="text-xs text-muted-foreground">How the site is used for this contract.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["residential", "Residential"],
                  ["commercial", "Commercial"]
                ] as const
              ).map(([id, label]) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-muted/40"
                >
                  <input
                    type="radio"
                    name="useSegment"
                    className="shrink-0"
                    checked={useSegment === id}
                    onChange={() => {
                      setUseSegment(id);
                      setUseStructure(null);
                    }}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {useSegment ? (
            <div>
              <h3 className="text-sm font-medium">2. Building, villa, unit, or compound</h3>
              <p className="text-xs text-muted-foreground">The physical / agreement shape for this {useSegment} use.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PROPERTY_STRUCTURE_CARDS.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="useStructure"
                        className="shrink-0"
                        checked={useStructure === c.id}
                        onChange={() => setUseStructure(c.id)}
                      />
                      <span className="text-sm font-medium">{c.title}</span>
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">{c.help}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {propertySetup?.propertyScope !== "specific_units" ? (
            <label className="text-sm">
              <span className="font-medium">Building operations</span>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingManagementStatus}
                onChange={(e) =>
                  setBuildingManagementStatus(e.target.value as "managed_by_hestia" | "location_only_not_managed")
                }
              >
                <option value="managed_by_hestia">Managed by Hestia</option>
                <option value="location_only_not_managed">Location only (not managed)</option>
              </select>
            </label>
          ) : propertySetup != null ? (
            <p className="text-xs text-muted-foreground">
              For unit(s) only, the building is treated as location-only for this agreement (same as the manual owner
              form).
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Building / property</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Building code (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingCode}
                onChange={(e) => setBuildingCode(e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Building name</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">City</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingCity}
                onChange={(e) => setBuildingCity(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Zone</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingZone}
                onChange={(e) => setBuildingZone(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Street</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingStreet}
                onChange={(e) => setBuildingStreet(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Building number</span>
              <input
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingNumber}
                onChange={(e) => setBuildingNumber(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Area name (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingAreaName}
                onChange={(e) => setBuildingAreaName(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Notes (optional)</span>
              <textarea
                className="mt-1 min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingNotes}
                onChange={(e) => setBuildingNotes(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Google Maps URL (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={buildingMapsUrl}
                onChange={(e) => setBuildingMapsUrl(e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Units</h2>
          <p className="text-sm text-muted-foreground">
            {propertyScope === "specific_units"
              ? "Add every unit number covered by this agreement (required). You can set type, bedrooms, and rent now or edit later in Portfolio."
              : "Optionally add starter units and details now, or skip and add or edit them later from Portfolio."}
          </p>
          <ul className="space-y-4">
            {unitLines.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-start min-[500px]:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label className="text-sm font-medium" htmlFor={`u-num-${row.id}`}>
                        Unit number
                        {propertyScope === "specific_units" ? " (required if this row is used)" : null}
                      </label>
                      <input
                        id={`u-num-${row.id}`}
                        name={`unitNumber-${row.id}`}
                        autoComplete="off"
                        maxLength={64}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                        placeholder="e.g. 101, G-02"
                        value={row.unitNumber}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUnitLines((lines) =>
                            lines.map((l) => (l.id === row.id ? { ...l, unitNumber: v } : l))
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium" htmlFor={`u-type-${row.id}`}>
                          Type (optional)
                        </label>
                        <input
                          id={`u-type-${row.id}`}
                          name={`unitType-${row.id}`}
                          autoComplete="off"
                          maxLength={UNIT_STR_MAX}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                          placeholder="e.g. 1BR, office"
                          value={row.unitType}
                          onChange={(e) =>
                            setUnitLines((lines) =>
                              lines.map((l) => (l.id === row.id ? { ...l, unitType: e.target.value } : l))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium" htmlFor={`u-floor-${row.id}`}>
                          Floor (optional)
                        </label>
                        <input
                          id={`u-floor-${row.id}`}
                          name={`floor-${row.id}`}
                          autoComplete="off"
                          maxLength={UNIT_STR_MAX}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                          placeholder="e.g. 3, G"
                          value={row.floor}
                          onChange={(e) =>
                            setUnitLines((lines) =>
                              lines.map((l) => (l.id === row.id ? { ...l, floor: e.target.value } : l))
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium" htmlFor={`u-br-${row.id}`}>
                          Bedrooms
                        </label>
                        <input
                          id={`u-br-${row.id}`}
                          name={`bedrooms-${row.id}`}
                          type="number"
                          min={0}
                          max={20}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                          placeholder="—"
                          value={row.bedrooms}
                          onChange={(e) =>
                            setUnitLines((lines) =>
                              lines.map((l) => (l.id === row.id ? { ...l, bedrooms: e.target.value } : l))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium" htmlFor={`u-ba-${row.id}`}>
                          Bathrooms
                        </label>
                        <input
                          id={`u-ba-${row.id}`}
                          name={`bathrooms-${row.id}`}
                          type="number"
                          min={0}
                          max={20}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                          placeholder="—"
                          value={row.bathrooms}
                          onChange={(e) =>
                            setUnitLines((lines) =>
                              lines.map((l) => (l.id === row.id ? { ...l, bathrooms: e.target.value } : l))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium" htmlFor={`u-rent-${row.id}`}>
                          Monthly rent (optional)
                        </label>
                        <input
                          id={`u-rent-${row.id}`}
                          name={`monthlyRent-${row.id}`}
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                          placeholder="—"
                          value={row.monthlyRent}
                          onChange={(e) =>
                            setUnitLines((lines) =>
                              lines.map((l) => (l.id === row.id ? { ...l, monthlyRent: e.target.value } : l))
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-[500px]:w-auto shrink-0"
                    onClick={() => setUnitLines((lines) => lines.filter((l) => l.id !== row.id))}
                    disabled={unitLines.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setUnitLines((l) => [...l, newUnitLine()])}
          >
            + Add unit row
          </Button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Financial rules preview</h2>
          <p className="mt-3 text-sm text-muted-foreground">{financialPreview}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            After confirmation, the system creates scheduled expenses or PM fee receipts when applicable (same rules as
            manual owner onboarding).
          </p>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Review &amp; confirm</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Check every section below. When you confirm, we create the owner account, building, units (if any),
              owner contract, and finance schedules in one transaction.
            </p>
          </div>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Owner</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{ownerType}</dd>
              <dt className="text-muted-foreground">{nameLabel}</dt>
              <dd>{fullName || "—"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{email || "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{phone || "—"}</dd>
              <dt className="text-muted-foreground">Password</dt>
              <dd>{password ? "•".repeat(Math.min(password.length, 12)) : "—"}</dd>
              {ownerType === "individual" ? (
                <>
                  <dt className="text-muted-foreground">QID</dt>
                  <dd>{qidNumber || "—"}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted-foreground">CR number</dt>
                  <dd>{crNumber || "—"}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contract</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Agreement type</dt>
              <dd>{CONTRACT_TYPE_LABEL[contractType] ?? contractType}</dd>
              <dt className="text-muted-foreground">Term</dt>
              <dd>
                {contractStartDate || "—"} → {contractEndDate || "—"}
              </dd>
              <dt className="text-muted-foreground">Signed file</dt>
              <dd>{contractFileSummary}</dd>
              {contractType === "fixed_lease" ? (
                <>
                  <dt className="text-muted-foreground">Fixed amount / mo</dt>
                  <dd>{fixedLeaseAmount || "—"}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted-foreground">Fee structure</dt>
                  <dd>{managementFeeStructureLabel(managementFeeStructure)}</dd>
                  {(managementFeeStructure === "commission_based_fee" ||
                    managementFeeStructure === "hybrid_fee_structure") && (
                    <>
                      <dt className="text-muted-foreground">Commission</dt>
                      <dd>{managementFeePercentage ? `${managementFeePercentage}%` : "—"}</dd>
                      <dt className="text-muted-foreground">Revenue basis</dt>
                      <dd>{feeCalculationBasisLabel(revenueCalculationMethod)}</dd>
                    </>
                  )}
                  {(managementFeeStructure === "fixed_monthly_management_fee" ||
                    managementFeeStructure === "hybrid_fee_structure") && (
                    <>
                      <dt className="text-muted-foreground">Monthly mgmt fee</dt>
                      <dd>{monthlyManagementFeeAmount || "—"}</dd>
                    </>
                  )}
                </>
              )}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Property setup</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Use &amp; form</dt>
              <dd>
                {propertySetup && useSegment && useStructure ? (
                  <div>
                    <span className="capitalize">{useSegment}</span> ·{" "}
                    {PROPERTY_STRUCTURE_CARDS.find((c) => c.id === useStructure)?.title ?? "—"}
                    <p className="mt-1 text-xs text-muted-foreground">{propertySetup.reviewLine}</p>
                  </div>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-muted-foreground">Building operations</dt>
              <dd>
                {propertyScope === "specific_units"
                  ? "Location-only container for selected units (same as manual owner form)"
                  : BUILDING_MGMT_LABEL[buildingManagementStatus] ?? buildingManagementStatus}
              </dd>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Building / property</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Code</dt>
              <dd>{buildingCode.trim() || "Auto-generated on save"}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{buildingName || "—"}</dd>
              <dt className="text-muted-foreground">City</dt>
              <dd>{buildingCity || "—"}</dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd>
                Zone {buildingZone || "—"}, {buildingStreet || "—"}, bldg. {buildingNumber || "—"}
                {buildingAreaName.trim() ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">Area: {buildingAreaName}</span>
                  </>
                ) : null}
              </dd>
              {buildingNotes.trim() ? (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{buildingNotes}</dd>
                </>
              ) : null}
              {buildingMapsUrl.trim() ? (
                <>
                  <dt className="text-muted-foreground">Maps URL</dt>
                  <dd className="break-all text-primary">{buildingMapsUrl}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Units</h3>
            {unitsPayload.length ? (
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm">
                {unitsPayload.map((u, idx) => {
                  const bits: string[] = [];
                  if (u.unitType) {
                    bits.push(`type ${u.unitType}`);
                  }
                  if (u.floor) {
                    bits.push(`floor ${u.floor}`);
                  }
                  if (typeof u.bedrooms === "number") {
                    bits.push(`${u.bedrooms} bed`);
                  }
                  if (typeof u.bathrooms === "number") {
                    bits.push(`${u.bathrooms} bath`);
                  }
                  if (u.monthlyRent) {
                    bits.push(`rent ${u.monthlyRent}`);
                  }
                  const sub = bits.length ? ` — ${bits.join(" · ")}` : "";
                  return (
                    <li key={`${u.unitNumber}-${idx}`}>
                      {u.unitNumber}
                      {sub}
                    </li>
                  );
                })}
              </ul>
            ) : propertyScope === "specific_units" ? (
              <p className="mt-3 text-sm">— (required for this scope — go back)</p>
            ) : (
              <p className="mt-3 text-sm">None — you can add units later in Portfolio</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance automation</h3>
            <p className="mt-3 text-sm text-muted-foreground">{financialPreview}</p>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={ownerFinancialAccess}
              onChange={(e) => setOwnerFinancialAccess(e.target.checked)}
            />
            <span>
              <span className="font-medium">Grant owner financial portal access</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                When enabled, the building record allows owner financial visibility (same as manual property settings).
              </span>
            </span>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/portfolio">Cancel</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={pending}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={pending}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Confirm & create"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
