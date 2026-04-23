-- Tenant requests (jobs): kind for renewal | transfer | handover
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS request_kind TEXT;

COMMENT ON COLUMN jobs.request_kind IS 'For source_type tenant_request: renewal | transfer | handover';
