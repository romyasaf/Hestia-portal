-- Phase 5: optional visit / meeting time for tenant-request jobs (aligns with maintenance appointmentAt, checkout scheduledAt)

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
