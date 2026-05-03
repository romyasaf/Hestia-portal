/** Where an owner contract applies (physical scope — separate from agreement_type / contract_type). */
export const PROPERTY_SCOPES = ["whole_building", "specific_units", "whole_villa"] as const;
export type PropertyScope = (typeof PROPERTY_SCOPES)[number];

export function parsePropertyScope(raw: string | null | undefined): PropertyScope | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "whole_building" || t === "specific_units" || t === "whole_villa") {
    return t;
  }
  return null;
}

export function propertyScopeLabel(s: string | null | undefined): string {
  switch (parsePropertyScope(s) ?? "") {
    case "whole_building":
      return "Whole building";
    case "specific_units":
      return "Specific unit(s)";
    case "whole_villa":
      return "Whole villa";
    default:
      return "—";
  }
}

/** Maps legacy profile ownership_scope to default property_scope for new contracts. */
export function propertyScopeFromLegacyOwnershipScope(
  legacy: "building_owner" | "unit_owner",
  propertyType?: string | null
): PropertyScope {
  if (legacy === "unit_owner") {
    return "specific_units";
  }
  if ((propertyType ?? "").trim().toLowerCase() === "villa") {
    return "whole_villa";
  }
  return "whole_building";
}
