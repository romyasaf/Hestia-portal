import { prisma } from "@/lib/prisma";

/**
 * Public tables that Prisma `@@map` expects. Keep in sync with `apps/web/prisma/schema.prisma`.
 * Startup validation fails fast when migrations were not applied.
 */
const REQUIRED_PUBLIC_TABLES = [
  "roles",
  "users",
  "user_roles",
  "staff_permission_grants",
  "properties",
  "units",
  "leases",
  "lease_check_ins",
  "lease_check_in_issues",
  "lease_checkouts",
  "tickets",
  "maintenance_attachments",
  "announcements",
  "jobs",
  "invoices",
  "payments",
  "expenses",
  "receipts",
  "inventory_items",
  "stock_transactions",
  "lead_inquiries",
  "password_reset_tokens"
] as const;

/**
 * Verifies PostgreSQL `public` contains every table Prisma models expect.
 * @throws Error listing missing tables
 */
export async function validateDatabaseSchemaOrThrow(): Promise<void> {
  const missing: string[] = [];

  for (const tableName of REQUIRED_PUBLIC_TABLES) {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      ) AS "exists"
    `;
    if (!rows[0]?.exists) {
      missing.push(tableName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[db] Missing public tables (apply db/schema.sql or db/migrations in order): ${missing.join(", ")}`
    );
  }
}
