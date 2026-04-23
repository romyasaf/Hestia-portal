"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { recordInvoicePayment } from "@/server/actions/accounting";
import { Button } from "@/components/ui/button";

type Inv = { id: string; invoiceNo: string; totalAmount: string; paidAmount: string };

type Props = { invoices: Inv[] };

export function RecordInvoicePaymentForm({ invoices }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!invoiceId) {
      setMessage("Select an invoice.");
      return;
    }
    startTransition(async () => {
      const res = await recordInvoicePayment({
        invoiceId,
        amount,
        method,
        referenceNo: referenceNo || undefined
      });
      if (!res.ok) {
        setMessage(res.error === "not_found" ? "Invoice not found." : "Could not record payment.");
        return;
      }
      setAmount("");
      setReferenceNo("");
      router.refresh();
    });
  };

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No open invoices to pay against in the current list.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Record invoice payment</h3>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Invoice</label>
        <select
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.invoiceNo} — total {i.totalAmount}, paid {i.paidAmount}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Payment amount</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Method</label>
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Reference #</label>
        <input
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
