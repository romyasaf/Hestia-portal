export const INVOICE_PAYMENT_STATUSES = ["unpaid", "partial", "paid", "overdue", "failed"] as const;

export const EXPENSE_PAYMENT_STATUSES = ["pending", "approved", "paid", "failed", "voided"] as const;

export const RECEIPT_PAYMENT_STATUSES = ["pending", "recorded", "reconciled", "failed", "voided"] as const;

export function invoicePaymentLabel(s: string): string {
  const v = s.toLowerCase();
  const m: Record<string, string> = {
    unpaid: "Unpaid",
    partial: "Partially paid",
    paid: "Paid",
    overdue: "Overdue",
    failed: "Failed"
  };
  return m[v] ?? s;
}

export function expensePaymentLabel(s: string): string {
  const v = s.toLowerCase();
  const m: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    failed: "Failed",
    voided: "Voided"
  };
  return m[v] ?? s;
}

export function receiptPaymentLabel(s: string): string {
  const v = s.toLowerCase();
  const m: Record<string, string> = {
    pending: "Pending",
    recorded: "Recorded",
    reconciled: "Reconciled",
    failed: "Failed",
    voided: "Voided"
  };
  return m[v] ?? s;
}
