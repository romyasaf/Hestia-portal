export const OWNERSHIP_SCOPES = ["building_owner", "unit_owner"] as const;
export type OwnershipScope = (typeof OWNERSHIP_SCOPES)[number];

export function parseOwnershipScope(raw: string | null | undefined): OwnershipScope | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "building_owner" || t === "unit_owner") {
    return t;
  }
  return null;
}

export function ownershipScopeLabel(s: string | null | undefined): string {
  switch (parseOwnershipScope(s) ?? "") {
    case "building_owner":
      return "Building owner";
    case "unit_owner":
      return "Unit owner";
    default:
      return "—";
  }
}
