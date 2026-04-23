/**
 * Receipt PDF pipeline: build a serializable document model here, then pass to
 * @react-pdf/renderer or pdf-lib in `renderReceiptPdf` once a renderer is added.
 */

export type ReceiptPdfDocumentInput = {
  receiptNo: string;
  receivedAtIso: string;
  amount: string;
  method: string;
  referenceNo: string | null;
  paymentStatus: string;
  category: string | null;
  subcategory: string | null;
  leaseSummary: string | null;
  ticketSummary: string | null;
  invoiceNo: string | null;
  checkoutSummary: string | null;
  notes: string | null;
  recordedByName: string | null;
};

/** Normalize DB + UI fields into one object for PDF / print views. */
export function buildReceiptPdfDocumentInput(input: {
  receiptNo: string;
  receivedAt: Date | string;
  amount: string;
  method: string;
  referenceNo?: string | null;
  paymentStatus: string;
  category?: string | null;
  subcategory?: string | null;
  leaseLabel?: string | null;
  ticketLabel?: string | null;
  invoiceNo?: string | null;
  checkoutLabel?: string | null;
  notes?: string | null;
  recordedByName?: string | null;
}): ReceiptPdfDocumentInput {
  const receivedAtIso =
    typeof input.receivedAt === "string" ? input.receivedAt : input.receivedAt.toISOString();

  return {
    receiptNo: input.receiptNo,
    receivedAtIso,
    amount: input.amount,
    method: input.method,
    referenceNo: input.referenceNo ?? null,
    paymentStatus: input.paymentStatus,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    leaseSummary: input.leaseLabel ?? null,
    ticketSummary: input.ticketLabel ?? null,
    invoiceNo: input.invoiceNo ?? null,
    checkoutSummary: input.checkoutLabel ?? null,
    notes: input.notes ?? null,
    recordedByName: input.recordedByName ?? null
  };
}

export async function renderReceiptPdfPlaceholder(_input: ReceiptPdfDocumentInput): Promise<Uint8Array> {
  throw new Error(
    "PDF generation not implemented. Wire buildReceiptPdfDocumentInput → @react-pdf/renderer in lib/pdf/receipts.ts"
  );
}
