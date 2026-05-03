-- Global check-in inventory template (merged with per-unit JSON on lease onboarding).
-- Not used on public listings.

CREATE TABLE IF NOT EXISTS checkin_inventory_master_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INT NOT NULL DEFAULT 0,
  item_name TEXT NOT NULL,
  condition_hint TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_inventory_master_items_sort_idx
  ON checkin_inventory_master_items (sort_order, id);

-- Seed defaults when table is empty (idempotent).
INSERT INTO checkin_inventory_master_items (sort_order, item_name, condition_hint, notes)
SELECT * FROM (VALUES
  (0, 'General walls & paint', 'Document baseline', NULL),
  (1, 'Flooring', 'Document baseline', NULL),
  (2, 'Windows & balcony doors', 'Document baseline', NULL),
  (3, 'Kitchen cabinets & counters', 'Document baseline', NULL),
  (4, 'Bathroom fixtures', 'Document baseline', NULL),
  (5, 'Lighting & power outlets', 'Document baseline', NULL),
  (6, 'AC / ventilation grilles', 'Document baseline', NULL),
  (7, 'Keys, remotes, access cards', 'Received as listed', NULL)
) AS v(sort_order, item_name, condition_hint, notes)
WHERE NOT EXISTS (SELECT 1 FROM checkin_inventory_master_items LIMIT 1);
