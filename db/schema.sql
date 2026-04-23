-- Property Ops Platform - Initial MVP schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE staff_permission_grants (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_code)
);

CREATE INDEX idx_staff_permission_grants_user ON staff_permission_grants(user_id);

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Qatar',
  owner_user_id UUID REFERENCES users(id),
  owner_financial_access BOOLEAN NOT NULL DEFAULT false,
  owner_contract_type TEXT NOT NULL DEFAULT 'managed' CHECK (owner_contract_type IN ('operator', 'managed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id),
  unit_number TEXT NOT NULL,
  unit_type TEXT,
  bedrooms INT,
  bathrooms INT,
  monthly_rent NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'available',
  listing_title TEXT,
  listing_description TEXT,
  listing_monthly_price NUMERIC(12,2),
  listing_amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  listing_cover_image_url TEXT,
  listing_gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  checkin_inventory_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(property_id, unit_number)
);

CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tenant_user_id UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC(12,2) NOT NULL,
  deposit_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewal_pending')),
  contract_signed_at TIMESTAMPTZ,
  contract_signer_name TEXT,
  cheque_delivery_state TEXT NOT NULL DEFAULT 'pending' CHECK (cheque_delivery_state IN ('pending', 'appointment_booked', 'marked_delivered', 'approved')),
  cheque_appointment_at TIMESTAMPTZ,
  cheque_appointment_notes TEXT,
  cheque_marked_delivered_at TIMESTAMPTZ,
  cheque_approved_at TIMESTAMPTZ,
  cheque_approved_by_user_id UUID REFERENCES users(id),
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_checkin_inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT UNIQUE NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  opened_by_user_id UUID NOT NULL REFERENCES users(id),
  assigned_to_user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'Pending Review',
  title TEXT NOT NULL,
  description TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  quoted_amount NUMERIC(12,2),
  quote_description TEXT,
  internal_cost NUMERIC(12,2),
  approval_needed BOOLEAN NOT NULL DEFAULT false,
  permission_to_enter BOOLEAN NOT NULL DEFAULT false,
  appointment_at TIMESTAMPTZ
);

CREATE TABLE maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_attachments_ticket_id ON maintenance_attachments(maintenance_ticket_id);

CREATE TABLE announcements (
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

CREATE INDEX idx_announcements_published ON announcements(is_published, published_at);
CREATE INDEX idx_announcements_property_id ON announcements(property_id);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_no TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL, -- ticket | owner_request | tenant_request | client_request
  source_id UUID,
  requester_user_id UUID NOT NULL REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  request_kind TEXT, -- renewal | transfer | handover when source_type = tenant_request
  title TEXT NOT NULL,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  estimated_amount NUMERIC(12,2),
  approved_amount NUMERIC(12,2),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lease_check_ins (
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

CREATE TABLE lease_check_in_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES lease_check_ins(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  details TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  area_label TEXT,
  converted_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lease_check_ins_lease_id ON lease_check_ins(lease_id);
CREATE INDEX idx_lease_check_ins_status ON lease_check_ins(status);
CREATE INDEX idx_lease_check_in_issues_check_in_id ON lease_check_in_issues(check_in_id);
CREATE UNIQUE INDEX uniq_lease_check_in_issues_converted_ticket_id ON lease_check_in_issues(converted_ticket_id);

CREATE TABLE lease_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'requested',
  tenant_notes TEXT,
  preferred_move_out_date DATE,
  scheduled_at TIMESTAMPTZ,
  admin_notes TEXT,
  inspection_outcome TEXT,
  damages_summary TEXT,
  deduction_amount NUMERIC(12,2),
  deposit_return_amount NUMERIC(12,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lease_checkouts_lease_id ON lease_checkouts(lease_id);
CREATE INDEX idx_lease_checkouts_status ON lease_checkouts(status);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  lease_id UUID REFERENCES leases(id),
  job_id UUID REFERENCES jobs(id),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  reference_no TEXT
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id),
  job_id UUID REFERENCES jobs(id),
  lease_checkout_id UUID REFERENCES lease_checkouts(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC(12,2) NOT NULL,
  vendor_name TEXT,
  expense_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT
);

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  lease_checkout_id UUID REFERENCES lease_checkouts(id) ON DELETE SET NULL,
  category TEXT,
  subcategory TEXT,
  amount NUMERIC(12,2) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL,
  reference_no TEXT,
  payment_status TEXT NOT NULL DEFAULT 'recorded',
  notes TEXT,
  recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_lease_id ON receipts(lease_id);
CREATE INDEX idx_receipts_ticket_id ON receipts(ticket_id);
CREATE INDEX idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX idx_receipts_received_at ON receipts(received_at);
CREATE INDEX idx_receipts_lease_checkout_id ON receipts(lease_checkout_id);
CREATE INDEX idx_expenses_lease_id ON expenses(lease_id);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);
CREATE INDEX idx_expenses_lease_checkout_id ON expenses(lease_checkout_id);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  quantity_on_hand NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL, -- in | out | adjust
  quantity NUMERIC(12,2) NOT NULL,
  reference_type TEXT, -- ticket | job | purchase
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lead_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('owner', 'tenant', 'contracting')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  converted_tenant_user_id UUID REFERENCES users(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_inquiries_type ON lead_inquiries(inquiry_type);
CREATE INDEX idx_lead_inquiries_status ON lead_inquiries(status);
CREATE INDEX idx_lead_inquiries_created_at ON lead_inquiries(created_at DESC);
CREATE INDEX idx_lead_inquiries_converted_tenant ON lead_inquiries(converted_tenant_user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
