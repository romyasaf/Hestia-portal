-- Tenant lease onboarding (contract → cheque delivery approval → check-in), lead conversion, unit inventory template.

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signer_name TEXT,
  ADD COLUMN IF NOT EXISTS cheque_delivery_state TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cheque_appointment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cheque_appointment_notes TEXT,
  ADD COLUMN IF NOT EXISTS cheque_marked_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cheque_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cheque_approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_checkin_inventory JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_cheque_delivery_state_check;
ALTER TABLE leases ADD CONSTRAINT leases_cheque_delivery_state_check CHECK (
  cheque_delivery_state IN ('pending', 'appointment_booked', 'marked_delivered', 'approved')
);

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS checkin_inventory_template JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE lead_inquiries
  ADD COLUMN IF NOT EXISTS converted_tenant_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lead_inquiries_converted_tenant ON lead_inquiries(converted_tenant_user_id);

-- Existing non-draft leases: treat onboarding as already complete so current tenants are not blocked.
-- Draft leases stay without onboarding completion until promoted and handled in-app.
UPDATE leases
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE onboarding_completed_at IS NULL
  AND LOWER(status) IN ('active', 'expired', 'terminated', 'renewal_pending');
