-- Maintenance: quotes, scheduling, approval flag, internal cost, permission to enter; attachments; announcements.

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS quoted_amount NUMERIC(12,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS quote_description TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS internal_cost NUMERIC(12,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS approval_needed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS permission_to_enter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS appointment_at TIMESTAMPTZ;

COMMENT ON COLUMN tickets.quoted_amount IS 'Staff-submitted quote amount';
COMMENT ON COLUMN tickets.quote_description IS 'Staff quote / scope notes for admin and tenant';
COMMENT ON COLUMN tickets.internal_cost IS 'Admin/staff internal cost (not shown to tenant by default)';
COMMENT ON COLUMN tickets.approval_needed IS 'When true, admin must send to Awaiting Tenant Approval before Approved';
COMMENT ON COLUMN tickets.permission_to_enter IS 'Tenant permission to enter if not home';
COMMENT ON COLUMN tickets.appointment_at IS 'Scheduled visit datetime when status is Scheduled';

CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_ticket_id ON maintenance_attachments(maintenance_ticket_id);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'all',
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_property_id ON announcements(property_id);

COMMENT ON COLUMN announcements.audience_type IS 'all | tenants | staff | owners | building';
