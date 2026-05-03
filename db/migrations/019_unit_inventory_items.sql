-- Phase 3: structured per-unit inventory (not public listing).

CREATE TABLE IF NOT EXISTS unit_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  condition_label TEXT NOT NULL DEFAULT 'good',
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_inventory_items_unit ON unit_inventory_items(unit_id);
