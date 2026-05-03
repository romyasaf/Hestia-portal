-- Phase 1: building maps URL, owner/tenant profile tables, lease operational extensions.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

CREATE TABLE IF NOT EXISTS owner_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL DEFAULT 'individual' CHECK (owner_type IN ('individual', 'company')),
  whats_app_phone TEXT,
  address_line TEXT,
  notes TEXT,
  qid_number TEXT,
  qid_expiry DATE,
  qid_photo_url TEXT,
  commercial_registration_number TEXT,
  cr_document_url TEXT,
  default_owner_contract_type TEXT NOT NULL DEFAULT 'managed' CHECK (default_owner_contract_type IN ('operator', 'managed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  whats_app_phone TEXT,
  nationality TEXT,
  qid_number TEXT,
  qid_expiry DATE,
  qid_photo_url TEXT,
  passport_number TEXT,
  passport_photo_url TEXT,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS digital_signature_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS unsigned_contract_document_url TEXT;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS signed_contract_document_url TEXT;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS cheque_received_at TIMESTAMPTZ;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS cheque_received_by_user_id UUID REFERENCES users(id);

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS onboarding_contract_signed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS onboarding_cheque_received BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS onboarding_checkin_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE leases SET onboarding_contract_signed = true WHERE contract_signed_at IS NOT NULL AND onboarding_contract_signed = false;
UPDATE leases SET onboarding_cheque_received = true WHERE cheque_approved_at IS NOT NULL AND onboarding_cheque_received = false;
UPDATE leases SET onboarding_checkin_completed = true WHERE onboarding_completed_at IS NOT NULL AND onboarding_checkin_completed = false;
UPDATE leases SET cheque_received_at = cheque_approved_at WHERE cheque_approved_at IS NOT NULL AND cheque_received_at IS NULL;
UPDATE leases SET cheque_received_by_user_id = cheque_approved_by_user_id WHERE cheque_approved_by_user_id IS NOT NULL AND cheque_received_by_user_id IS NULL;
