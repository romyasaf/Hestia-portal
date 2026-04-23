-- Accounting: receipts, expense payables, invoice payment tracking

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
COMMENT ON COLUMN invoices.payment_status IS 'unpaid | partial | paid | overdue';

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
COMMENT ON COLUMN expenses.payment_status IS 'pending | approved | paid | voided';

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
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
CREATE INDEX idx_expenses_lease_id ON expenses(lease_id);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);
