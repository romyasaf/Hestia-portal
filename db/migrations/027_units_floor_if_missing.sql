-- Idempotent: for DBs that ran old migrations before 025. Prisma `Unit` includes `floor`;
-- if missing, `unit.create` fails with P2022. Mirrored in
-- apps/web/lib/db/ensure-updated-at-columns.ts for self-heal.

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS floor TEXT;
