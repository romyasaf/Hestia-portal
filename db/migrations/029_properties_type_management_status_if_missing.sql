-- Idempotent: DBs before 025. Prisma Property model expects `property_type` and
-- `management_status`; missing columns cause P2022 on create/update. Full CHECKs: see 025.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'apartment_building';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS management_status TEXT NOT NULL DEFAULT 'managed_by_hestia';
