const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parses `owner_contracts.applies_to_unit_ids` JSON (array of UUID strings). */
export function parseAppliesToUnitIds(raw: unknown): string[] {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is string => typeof x === "string" && UUID_RE.test(x.trim())).map((x) => x.trim());
}
