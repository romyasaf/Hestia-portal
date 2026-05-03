import type { PrismaClient } from "@prisma/client";
import { getTableColumnSet, propertyTypeSelect } from "@/lib/db/table-columns";
import { parsePropertyScope, type PropertyScope } from "@/lib/owner/property-scope";

/**
 * Determines `property_scope` for an owner contract when not explicitly provided.
 * Prefer passing an explicit scope from admin forms.
 */
export async function resolvePropertyScopeForOwnerContract(
  db: Pick<PrismaClient, "property">,
  input: {
    explicitScopeRaw?: string | null;
    propertyId: string | null;
    unitId: string | null;
    appliesToUnitIds: string[] | null;
  }
): Promise<PropertyScope> {
  const parsed = parsePropertyScope(input.explicitScopeRaw);
  if (parsed) {
    return parsed;
  }
  if (input.appliesToUnitIds && input.appliesToUnitIds.length > 0) {
    return "specific_units";
  }
  if (input.unitId) {
    return "specific_units";
  }
  if (input.propertyId) {
    const propertyCols = await getTableColumnSet("properties");
    const p = await db.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, ...propertyTypeSelect(propertyCols) }
    });
    const pt = (p as { propertyType?: string | null } | null)?.propertyType;
    if ((pt ?? "").trim().toLowerCase() === "villa") {
      return "whole_villa";
    }
    return "whole_building";
  }
  return "whole_building";
}
