/** Values stored on `owner_contracts.contract_type` (includes legacy operator/managed). */
export const OWNER_AGREEMENT_CONTRACT_TYPES = [
  "operator",
  "managed",
  "fixed_lease",
  "property_management"
] as const;

export type OwnerAgreementContractType = (typeof OWNER_AGREEMENT_CONTRACT_TYPES)[number];

export type OwnerCreateContractType = "fixed_lease" | "property_management";

export function parseOwnerCreateContractType(raw: string | null | undefined): OwnerCreateContractType | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "fixed_lease") {
    return "fixed_lease";
  }
  if (t === "property_management") {
    return "property_management";
  }
  return null;
}

export function parseStoredOwnerAgreementType(raw: string | null | undefined): OwnerAgreementContractType {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "operator") {
    return "operator";
  }
  if (t === "managed") {
    return "managed";
  }
  if (t === "fixed_lease") {
    return "fixed_lease";
  }
  if (t === "property_management") {
    return "property_management";
  }
  return "managed";
}

export function ownerAgreementTypeLabel(t: string): string {
  switch (parseStoredOwnerAgreementType(t)) {
    case "fixed_lease":
      return "Fixed lease";
    case "property_management":
      return "Property management";
    case "operator":
      return "Operator (fixed lease)";
    case "managed":
      return "Managed";
    default:
      return t;
  }
}

/** Whether this agreement type uses the recurring monthly expense schedule (when amount > 0). */
export function ownerAgreementGeneratesMonthlyExpenses(t: OwnerAgreementContractType): boolean {
  return t === "operator" || t === "managed" || t === "fixed_lease";
}
