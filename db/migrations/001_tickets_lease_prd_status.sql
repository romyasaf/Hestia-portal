-- Maintenance tickets: lease link + PRD-aligned default status
-- Run against existing DB: psql ... -f db/migrations/001_tickets_lease_prd_status.sql

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_lease_id ON tickets(lease_id);

-- Map legacy statuses to PRD labels (idempotent-ish)
UPDATE tickets SET status = 'Pending Review' WHERE status IN ('open', 'Open');
UPDATE tickets SET status = 'In Progress' WHERE status IN ('in_progress', 'in progress');
UPDATE tickets SET status = 'Completed' WHERE status IN ('resolved', 'closed', 'Resolved', 'Closed');

ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'Pending Review';
