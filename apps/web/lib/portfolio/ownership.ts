export type OwnerProfile = { fullName: string; email: string };

export type ResolvedUnitOwner =
  | { userId: string; source: "unit"; profile: OwnerProfile }
  | { userId: string; source: "building"; profile: OwnerProfile }
  | { userId: null; source: null; profile: null };

export function resolveUnitOwner(params: {
  unitOwnerUserId: string | null;
  unitOwner: OwnerProfile | null;
  buildingOwnerUserId: string | null;
  buildingOwner: OwnerProfile | null;
}): ResolvedUnitOwner {
  if (params.unitOwnerUserId && params.unitOwner) {
    return { userId: params.unitOwnerUserId, source: "unit", profile: params.unitOwner };
  }
  if (params.buildingOwnerUserId && params.buildingOwner) {
    return { userId: params.buildingOwnerUserId, source: "building", profile: params.buildingOwner };
  }
  return { userId: null, source: null, profile: null };
}

export function formatResolvedOwnerLine(r: ResolvedUnitOwner): string {
  if (!r.profile) {
    return "Unassigned";
  }
  const base = `${r.profile.fullName} (${r.profile.email})`;
  return r.source === "unit" ? `${base} · unit-level` : `${base} · building-level`;
}

export function formatOwnerSourceHint(r: ResolvedUnitOwner): string {
  if (!r.source) {
    return "No unit-level or building-level owner is set.";
  }
  return r.source === "unit"
    ? "Direct owner on this unit (overrides building owner)."
    : "Inherited from the building record (no direct unit owner).";
}
