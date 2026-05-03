/**
 * Qatar-oriented structured building address (stored on `properties`).
 * Display: Zone X, Street Y, Building Z[, Area] – City
 */

export type BuildingAddressFields = {
  addressZone: string;
  addressStreet: string;
  addressBuildingNumber: string;
  city: string;
  addressAreaName?: string | null;
  addressNotes?: string | null;
};

export function formatBuildingAddressLine(p: BuildingAddressFields): string {
  const z = p.addressZone.trim();
  const s = p.addressStreet.trim();
  const b = p.addressBuildingNumber.trim();
  const city = p.city.trim();
  const area = p.addressAreaName?.trim();
  let line = `Zone ${z}, Street ${s}, Building ${b}`;
  if (area) {
    line += `, ${area}`;
  }
  line += ` – ${city}`;
  return line;
}
