/**
 * CLI (from repo root): `pnpm --filter @hestia/web db:validate`
 * Loads `apps/web/.env.local` then checks `DATABASE_URL` and required tables.
 */
import "./load-env-local";
import { prisma } from "../lib/prisma";
import { validateDatabaseSchemaOrThrow } from "../server/db/validate-database-schema";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await validateDatabaseSchemaOrThrow();
  console.log("Database schema OK — all required public tables exist.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
