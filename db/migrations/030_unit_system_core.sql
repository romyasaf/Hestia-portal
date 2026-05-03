-- Unit system: operational fields, check-in line audit, checkout inspection notes
-- Idempotent: safe to re-run.

ALTER TABLE units ADD COLUMN IF NOT EXISTS area_sqm NUMERIC(12, 2);
ALTER TABLE units ADD COLUMN IF NOT EXISTS furnishing_status TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS listing_notes TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS listing_availability_date DATE;

CREATE TABLE IF NOT EXISTS lease_check_in_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES lease_check_ins(id) ON DELETE CASCADE,
  line_key TEXT NOT NULL,
  line_label TEXT,
  unit_inventory_item_id UUID REFERENCES unit_inventory_items(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL,
  issue_description TEXT,
  issue_photo_url TEXT,
  tenant_line_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (check_in_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_lease_check_in_lines_check_in_id ON lease_check_in_lines(check_in_id);
CREATE INDEX IF NOT EXISTS idx_lease_check_in_lines_unit_item ON lease_check_in_lines(unit_inventory_item_id);

ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS inspection_notes TEXT;
ALTER TABLE lease_checkouts ADD COLUMN IF NOT EXISTS final_decision_notes TEXT;
