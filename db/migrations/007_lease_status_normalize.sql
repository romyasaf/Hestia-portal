-- Phase 4.5: canonical lowercase lease.status + CHECK constraint

UPDATE leases SET status = lower(trim(status));

UPDATE leases
SET status = 'draft'
WHERE status NOT IN ('draft', 'active', 'expired', 'terminated', 'renewal_pending');

ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_status_check;

ALTER TABLE leases
  ADD CONSTRAINT leases_status_check
  CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewal_pending'));
