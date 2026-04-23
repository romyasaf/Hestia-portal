-- Lease check-in / checkout workflows
-- Idempotent: safe if tables already exist (e.g. DB created from full db/schema.sql).

CREATE TABLE IF NOT EXISTS lease_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'submitted',
  tenant_notes TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lease_check_in_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES lease_check_ins(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_check_ins_lease_id ON lease_check_ins(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_check_ins_status ON lease_check_ins(status);
CREATE INDEX IF NOT EXISTS idx_lease_check_in_issues_check_in_id ON lease_check_in_issues(check_in_id);

CREATE TABLE IF NOT EXISTS lease_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'requested',
  tenant_notes TEXT,
  preferred_move_out_date DATE,
  scheduled_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_checkouts_lease_id ON lease_checkouts(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_checkouts_status ON lease_checkouts(status);
