-- Contract-based owner portal: building-level owner is either operator (fixed lease / landlord to company) or managed.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_contract_type TEXT NOT NULL DEFAULT 'managed';
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_owner_contract_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_owner_contract_type_check
  CHECK (owner_contract_type IN ('operator', 'managed'));
