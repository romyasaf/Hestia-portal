"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createAccountingReceipt } from "@/server/actions/accounting";
import { RECEIPT_PAYMENT_STATUSES } from "@/lib/accounting/statuses";
import { Button } from "@/components/ui/button";

type Opt = { id: string; label: string };

type Props = {
  leaseOptions: Opt[];
  ticketOptions: Opt[];
  invoiceOptions: Opt[];
  checkoutOptions: Opt[];
};

export function CreateReceiptForm({ leaseOptions, ticketOptions, invoiceOptions, checkoutOptions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [leaseCheckoutId, setLeaseCheckoutId] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("recorded");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createAccountingReceipt({
        amount,
        method,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
        leaseId: leaseId || undefined,
        ticketId: ticketId || undefined,
        invoiceId: invoiceId || undefined,
        leaseCheckoutId: leaseCheckoutId || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        paymentStatus
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_amount: "Enter a valid amount.",
          missing_financial_link: "Link this receipt to a lease, ticket, invoice, checkout, or owner contract.",
          missing_method: "Select a payment method."
        };
        setMessage(map[res.error] ?? "Could not save receipt.");
        return;
      }
      setAmount("");
      setReferenceNo("");
      setNotes("");
      setLeaseId("");
      setTicketId("");
      setInvoiceId("");
      setLeaseCheckoutId("");
      setCategory("");
      setSubcategory("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">Record receipt</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Money received. <strong className="text-foreground">One link is required</strong> — lease, maintenance ticket,
        invoice, checkout, or owner contract — so finance stays traceable.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Amount</label>
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
          <label className="text-sm font-medium">Method</label>
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="bank_transfer, card, cash…"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Reference #</label>
          <input
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Receipt payment status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {RECEIPT_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Lease (optional)</label>
          <select
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {leaseOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Ticket (optional)</label>
          <select
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {ticketOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Invoice (optional)</label>
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {invoiceOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Checkout record (optional)</label>
          <select
            value={leaseCheckoutId}
            onChange={(e) => setLeaseCheckoutId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {checkoutOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Category (optional)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Rent, deposit, fee…"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Subcategory (optional)</label>
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save receipt"}
      </Button>
    </form>
  );
}
