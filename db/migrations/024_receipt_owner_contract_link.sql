-- Link receipts to owner contracts (scheduled management fees, commission accruals).

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS owner_contract_id UUID REFERENCES owner_contracts(id) ON DELETE SET NULL;

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS source_receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS receipts_commission_source_contract_uidx
  ON receipts (source_receipt_id, owner_contract_id)
  WHERE source_receipt_id IS NOT NULL AND owner_contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS receipts_owner_contract_id_idx ON receipts (owner_contract_id);

COMMENT ON COLUMN receipts.owner_contract_id IS 'Management fee income or other flows tied to an owner agreement.';
COMMENT ON COLUMN receipts.source_receipt_id IS 'Tenant rent receipt that triggered a derived commission receipt.';
