import { prisma } from "@/lib/prisma";

const cache = new Map<string, Set<string>>();

/**
 * Columns present on a table (public schema). Cached per process so partially-migrated
 * dev DBs can omit fields Prisma expects but Postgres does not have yet.
 */
export async function getTableColumnSet(table: string, schema = "public"): Promise<Set<string>> {
  const key = `${schema}.${table}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
  `;
  const set = new Set(rows.map((r) => r.column_name));
  cache.set(key, set);
  return set;
}

/**
 * After DDL (e.g. `ALTER TABLE … ADD COLUMN`) the cache must be cleared or later
 * `getTableColumnSet` calls in this process can stay stale.
 */
export function clearTableColumnCacheKey(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  cache.delete(key);
}

/** Use in Prisma `select` when `property_type` may be missing (DB before migration 025). */
export function propertyTypeSelect(propertyCols: Set<string>): { propertyType: true } | Record<string, never> {
  return propertyCols.has("property_type") ? { propertyType: true } : {};
}
