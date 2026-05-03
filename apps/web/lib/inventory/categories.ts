export const UNIT_INVENTORY_CATEGORIES = [
  "furniture",
  "appliances",
  "kitchen",
  "bathroom",
  "bedroom",
  "living_room",
  "keys_access",
  "ac_units",
  "curtains",
  "lighting",
  "walls_paint",
  "flooring",
  "balcony",
  "other"
] as const;

export type UnitInventoryCategory = (typeof UNIT_INVENTORY_CATEGORIES)[number];

export function normalizeUnitInventoryCategory(raw: string | null | undefined): UnitInventoryCategory {
  const s = (raw ?? "other").trim().toLowerCase().replace(/\s+/g, "_");
  return (UNIT_INVENTORY_CATEGORIES as readonly string[]).includes(s) ? (s as UnitInventoryCategory) : "other";
}
