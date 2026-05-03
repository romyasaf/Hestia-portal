-- Tenant profile: individual vs company + lifecycle status.

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS tenant_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (tenant_type IN ('individual', 'company'));

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS tenant_lifecycle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (tenant_lifecycle_status IN ('active', 'previous', 'lead_pending'));

ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS contact_person_name TEXT;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS commercial_registration_number TEXT;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS cr_document_url TEXT;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS authorized_signatory TEXT;

-- Existing tenant-role users without a profile row (legacy).
INSERT INTO tenant_profiles (user_id, tenant_type, tenant_lifecycle_status)
SELECT ur.user_id, 'individual', 'active'
FROM user_roles ur
INNER JOIN roles r ON r.id = ur.role_id AND r.code = 'tenant'
WHERE NOT EXISTS (SELECT 1 FROM tenant_profiles tp WHERE tp.user_id = ur.user_id);
