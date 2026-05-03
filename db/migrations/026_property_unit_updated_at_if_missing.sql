-- Idempotent: for databases created before 025. Prisma Property/Unit models expect
-- `updated_at`; if missing, property.create() / unit.create() fail with P2022.
-- Mirrored in apps/web/lib/db/ensure-updated-at-columns.ts for self-heal in admin flows.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
