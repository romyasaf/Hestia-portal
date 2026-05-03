import { Prisma } from "@prisma/client";
import { clearTableColumnCacheKey, getTableColumnSet } from "@/lib/db/table-columns";
import { prisma } from "@/lib/prisma";

/**
 * Prisma / DB drift from migration 025+:
 * - `properties`: `updated_at`, `property_type`, `management_status` (P2022 on `property.create` / `property.update` if missing)
 * - `units`: `updated_at`, `floor`, `ownership_source`
 * Run **outside** an interactive `$transaction`. Safe: `IF NOT EXISTS`, admin-only. CHECKs from 025: apply full migration in prod.
 */
export async function ensurePropertyAndUnitUpdatedAtColumns(
  propertyCols: Set<string>,
  unitCols: Set<string>
): Promise<void> {
  let needClearProps = false;
  let needClearUnits = false;

  if (!propertyCols.has("property_type")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'apartment_building'`
    );
    needClearProps = true;
  }
  if (!propertyCols.has("management_status")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS management_status TEXT NOT NULL DEFAULT 'managed_by_hestia'`
    );
    needClearProps = true;
  }
  if (!propertyCols.has("updated_at")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    );
    needClearProps = true;
  }
  if (!unitCols.has("updated_at")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    );
    needClearUnits = true;
  }
  if (!unitCols.has("floor")) {
    await prisma.$executeRaw(Prisma.sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS floor TEXT`);
    needClearUnits = true;
  }
  if (!unitCols.has("ownership_source")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS ownership_source TEXT NOT NULL DEFAULT 'no_owner_contract'`
    );
    needClearUnits = true;
  }
  if (needClearProps) {
    clearTableColumnCacheKey("public", "properties");
  }
  if (needClearUnits) {
    clearTableColumnCacheKey("public", "units");
  }
}

/** Columns Prisma expects on `owner_contracts` (migrations 017, 022, 023, 025). */
const OWNER_CONTRACTS_COLUMN_NAMES = [
  "property_scope",
  "contract_status",
  "management_fee_structure",
  "management_fee_percentage",
  "monthly_management_fee_amount",
  "revenue_calculation_method",
  "applies_to_unit_ids",
  "document_url",
  "notes",
  "created_at",
  "updated_at"
] as const;

/**
 * Self-heal `owner_contracts` and `owner_profiles` for owner-agreement and similar flows.
 * Fixes P2022 on `ownerContract.create` / `ownerContract.update` (e.g. `document_url`, `updated_at`,
 * new fee/scope fields). Renames 022 `fee_calculation_basis` → `revenue_calculation_method` when
 * 025 renames not applied. Full CHECK constraints: run `db/migrations/025_*.sql` in production.
 */
export async function ensureOwnerContractsAndProfileColumns(
  contractCols: Set<string>,
  profileCols: Set<string>
): Promise<void> {
  let c = contractCols;
  if (c.has("fee_calculation_basis") && !c.has("revenue_calculation_method")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE owner_contracts RENAME COLUMN fee_calculation_basis TO revenue_calculation_method`
    );
    clearTableColumnCacheKey("public", "owner_contracts");
    c = await getTableColumnSet("owner_contracts");
  }

  if (OWNER_CONTRACTS_COLUMN_NAMES.some((name) => !c.has(name))) {
    const adds = [
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS property_scope TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS contract_status TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS management_fee_structure TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS management_fee_percentage NUMERIC(6, 3)`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS monthly_management_fee_amount NUMERIC(12, 2)`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS revenue_calculation_method TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS applies_to_unit_ids JSONB`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS document_url TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS notes TEXT`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
      Prisma.sql`ALTER TABLE owner_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    ];
    for (const stmt of adds) {
      await prisma.$executeRaw(stmt);
    }
    clearTableColumnCacheKey("public", "owner_contracts");
  }

  if (!profileCols.has("ownership_scope")) {
    await prisma.$executeRaw(
      Prisma.sql`ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS ownership_scope TEXT NOT NULL DEFAULT 'building_owner'`
    );
    clearTableColumnCacheKey("public", "owner_profiles");
  }
}
