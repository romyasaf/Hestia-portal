-- Unit-level ownership: optional direct owner on a unit (falls back to building-level owner when unset).
ALTER TABLE units ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_units_owner_user_id ON units(owner_user_id);
