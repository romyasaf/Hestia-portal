-- Per-staff portal permissions (subset of staff UI + ticket actions).
-- No rows for a staff user = legacy "full staff portal" (all known codes).
-- Any row = explicit allow-list for those codes only.

CREATE TABLE staff_permission_grants (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_code)
);

CREATE INDEX idx_staff_permission_grants_user ON staff_permission_grants(user_id);
