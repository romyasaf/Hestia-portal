-- Phase 4: owner financial flag, check-in issue metadata + ticket link,
-- checkout inspection / settlement, accounting traceability (checkout + subcategories)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_financial_access BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN properties.owner_financial_access IS 'When true, owner portal may show receipts/expense rollups for this building.';

ALTER TABLE lease_check_in_issues ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE lease_check_in_issues ADD COLUMN IF NOT EXISTS area_label TEXT;
ALTER TABLE lease_check_in_issues ADD COLUMN IF NOT EXISTS converted_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lease_check_in_issues_converted_ticket_id ON lease_check_in_issues(converted_ticket_id);

ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS inspection_outcome TEXT;
ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS damages_summary TEXT;
ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC(12,2);
ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS deposit_return_amount NUMERIC(12,2);
ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS lease_checkout_id UUID REFERENCES lease_checkouts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_lease_checkout_id ON expenses(lease_checkout_id);

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS lease_checkout_id UUID REFERENCES lease_checkouts(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subcategory TEXT;
CREATE INDEX IF NOT EXISTS idx_receipts_lease_checkout_id ON receipts(lease_checkout_id);
