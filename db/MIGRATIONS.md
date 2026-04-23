# Database migration strategy

## Source of truth

1. **`db/schema.sql`** — Full PostgreSQL DDL for a **greenfield** database (new environments, Docker first boot). Apply this file, then run seeds under `db/seeds/`.
2. **`db/migrations/*.sql`** — **Incremental** scripts for databases that already exist from an older snapshot. Apply in numeric order (`001` → `014`).

`apps/web/prisma/schema.prisma` must stay aligned with the **result** of applying `schema.sql` (or base + all migrations). After SQL changes, run `pnpm --filter @hestia/web db:generate` from the repo root.

## Applying changes

**New environment**

```bash
psql "$DATABASE_URL" -f db/schema.sql
# then seeds per README.md
```

**Existing environment (upgrade)**

```bash
psql "$DATABASE_URL" -f db/migrations/001_tickets_lease_prd_status.sql
psql "$DATABASE_URL" -f db/migrations/002_jobs_request_kind.sql
psql "$DATABASE_URL" -f db/migrations/003_lease_checkin_checkout.sql
psql "$DATABASE_URL" -f db/migrations/004_accounting_module.sql
psql "$DATABASE_URL" -f db/migrations/005_maintenance_workflow_announcements.sql
psql "$DATABASE_URL" -f db/migrations/006_phase4_operational_upgrades.sql
psql "$DATABASE_URL" -f db/migrations/007_lease_status_normalize.sql
psql "$DATABASE_URL" -f db/migrations/008_job_scheduled_at.sql
psql "$DATABASE_URL" -f db/migrations/009_mvp_inquiries_password_reset.sql
psql "$DATABASE_URL" -f db/migrations/010_staff_permission_grants.sql
psql "$DATABASE_URL" -f db/migrations/011_unit_listing_fields.sql
psql "$DATABASE_URL" -f db/migrations/012_tenant_onboarding.sql
psql "$DATABASE_URL" -f db/migrations/013_unit_direct_owner.sql
psql "$DATABASE_URL" -f db/migrations/014_property_owner_contract_type.sql
```

Migrations `003` and `004` use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so they are safe to re-run against a DB that already matches `db/schema.sql`.

## Schema validation (CI / manual)

The web app **does not** run Prisma table checks on Next.js boot (Prisma + the instrumentation bundle can mis-resolve the Edge engine and 500 every route). Validate the database explicitly:

**CLI (CI or after migrations):**

```bash
pnpm --filter @hestia/web install
pnpm --filter @hestia/web db:generate
pnpm --filter @hestia/web db:validate
```

## Prisma vs raw SQL

This repo uses **hand-authored SQL** as the canonical migration path; Prisma Client is generated from `schema.prisma` for type-safe queries. There is no `prisma migrate` history folder yet—do not run `prisma db push` against production unless you intend to drift from the SQL files.
