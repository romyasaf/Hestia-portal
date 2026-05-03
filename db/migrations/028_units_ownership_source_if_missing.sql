-- Idempotent: for DBs before 025. Prisma `Unit.ownership_source` is required; if missing, P2022.
-- Full constraint set is in 025; this is the column only for self-heal / manual apply.
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS ownership_source TEXT NOT NULL DEFAULT 'no_owner_contract';
