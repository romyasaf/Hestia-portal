/**
 * Dev-only: delete all buildings (properties + units + leases + related ops/accounting rows)
 * and users who have only the `owner` role (owner_profiles cascade via user delete).
 *
 * Usage (from apps/web): pnpm exec tsx scripts/cleanup-buildings-and-owners.ts --yes
 *
 * Requires DATABASE_URL (e.g. from .env.local via load-env-local).
 */
import "./load-env-local";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sql(s: string) {
  return prisma.$executeRawUnsafe(s);
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Refusing to run without --yes. This deletes ALL properties and owner-only users."
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (add to apps/web/.env.local).");
    process.exit(1);
  }

  const pid = "(SELECT id FROM properties)";

  const pre: ReturnType<typeof sql>[] = [];
  if (await columnExists("receipts", "source_receipt_id")) {
    pre.push(
      sql(`DELETE FROM receipts WHERE source_receipt_id IS NOT NULL`)
    );
  }

  await prisma.$transaction([
    ...pre,
    sql(
      `DELETE FROM owner_contracts WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM maintenance_attachments WHERE maintenance_ticket_id IN (SELECT id FROM tickets WHERE property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM receipts WHERE ticket_id IN (SELECT id FROM tickets WHERE property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM expenses WHERE ticket_id IN (SELECT id FROM tickets WHERE property_id IN ${pid})`
    ),
    sql(`DELETE FROM tickets WHERE property_id IN ${pid}`),
    sql(
      `DELETE FROM expenses WHERE job_id IN (SELECT id FROM jobs WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid}))`
    ),
    sql(
      `DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE job_id IN (SELECT id FROM jobs WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid})))`
    ),
    sql(
      `DELETE FROM invoices WHERE job_id IN (SELECT id FROM jobs WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid}))`
    ),
    sql(
      `DELETE FROM jobs WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM payments WHERE invoice_id IN (SELECT i.id FROM invoices i JOIN leases l ON i.lease_id = l.id JOIN units u ON l.unit_id = u.id WHERE u.property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM invoices WHERE lease_id IN (SELECT l.id FROM leases l JOIN units u ON l.unit_id = u.id WHERE u.property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM expenses WHERE lease_id IN (SELECT l.id FROM leases l JOIN units u ON l.unit_id = u.id WHERE u.property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM receipts WHERE lease_id IN (SELECT l.id FROM leases l JOIN units u ON l.unit_id = u.id WHERE u.property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id IN ${pid})`
    ),
    sql(
      `DELETE FROM expenses WHERE property_id IN ${pid} OR unit_id IN (SELECT id FROM units WHERE property_id IN ${pid})`
    ),
    sql(`UPDATE announcements SET property_id = NULL WHERE property_id IN ${pid}`),
    sql(`DELETE FROM properties`),
    sql(`DELETE FROM owner_contracts WHERE property_id IS NULL AND unit_id IS NULL`),
    sql(`DELETE FROM owner_contracts WHERE owner_user_id IN (
      SELECT u.id FROM users u
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code = 'owner'
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code <> 'owner'
      )
    )`),
    sql(`DELETE FROM users WHERE id IN (
      SELECT u.id FROM users u
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code = 'owner'
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code <> 'owner'
      )
    )`)
  ]);

  console.log("Cleanup finished: all properties removed; owner-only users deleted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
