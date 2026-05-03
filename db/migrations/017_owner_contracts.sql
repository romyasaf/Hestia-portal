-- Company ↔ owner agreements (separate from tenant leases). Drives recurring expense obligations.

CREATE TABLE IF NOT EXISTS owner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('operator', 'managed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly',
  amount NUMERIC(12, 2) NOT NULL,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (property_id IS NOT NULL OR unit_id IS NOT NULL),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS owner_contracts_owner_user_id_idx ON owner_contracts (owner_user_id);
CREATE INDEX IF NOT EXISTS owner_contracts_property_id_idx ON owner_contracts (property_id);
CREATE INDEX IF NOT EXISTS owner_contracts_unit_id_idx ON owner_contracts (unit_id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS owner_contract_id UUID REFERENCES owner_contracts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS expenses_owner_contract_id_idx ON expenses (owner_contract_id);
