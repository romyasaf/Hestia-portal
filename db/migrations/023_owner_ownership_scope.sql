-- Owner portfolio: explicit building vs unit ownership + multi-unit contracts.

ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS ownership_scope TEXT NOT NULL DEFAULT 'building_owner'
    CHECK (ownership_scope IN ('building_owner', 'unit_owner'));

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS applies_to_unit_ids JSONB;

COMMENT ON COLUMN owner_profiles.ownership_scope IS 'building_owner = whole building; unit_owner = one or more units only.';
COMMENT ON COLUMN owner_contracts.applies_to_unit_ids IS 'When set, contract covers these units (shared terms); null uses unit_id only.';
