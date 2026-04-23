"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createAccountingExpense } from "@/server/actions/accounting";
import { EXPENSE_PAYMENT_STATUSES, expensePaymentLabel } from "@/lib/accounting/statuses";
import { Button } from "@/components/ui/button";

type Opt = { id: string; label: string };

type Props = {
  propertyOptions: Opt[];
  leaseOptions: Opt[];
  ticketOptions: Opt[];
  jobOptions: Opt[];
  checkoutOptions: Opt[];
};

export function CreateExpenseForm({
  propertyOptions,
  leaseOptions,
  ticketOptions,
  jobOptions,
  checkoutOptions
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorName, setVendorName] = useState("");
  const [notes, setNotes] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [jobId, setJobId] = useState("");
  const [leaseCheckoutId, setLeaseCheckoutId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createAccountingExpense({
        category,
        subcategory: subcategory || undefined,
        amount,
        expenseDate,
        vendorName: vendorName || undefined,
        notes: notes || undefined,
        propertyId: propertyId || undefined,
        leaseId: leaseId || undefined,
        ticketId: ticketId || undefined,
        jobId: jobId || undefined,
        leaseCheckoutId: leaseCheckoutId || undefined,
        paymentStatus
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          missing_category: "Category is required.",
          invalid_amount: "Enter a valid amount.",
          invalid_date: "Invalid expense date.",
          missing_financial_link:
            "Link to a property, lease, ticket, contracting job, or checkout — at least one anchor is required."
        };
        setMessage(map[res.error] ?? "Could not save expense.");
        return;
      }
      setCategory("");
      setSubcategory("");
      setAmount("");
      setVendorName("");
      setNotes("");
      setPropertyId("");
      setLeaseId("");
      setTicketId("");
      setJobId("");
      setLeaseCheckoutId("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">Record expense</h2>
      <p className="text-xs text-muted-foreground sm:text-sm">
        <strong className="text-foreground">At least one link is required</strong> — property, lease, ticket, contracting
        job, or checkout — so every cost ties back to operations.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Category</label>
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Maintenance, utilities, legal…"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Subcategory (optional)</label>
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="HVAC, plumbing…"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
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
          <label className="text-sm font-medium">Expense date</label>
          <input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Vendor</label>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Payable status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {EXPENSE_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {expensePaymentLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Property (optional)</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {propertyOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
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
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Contracting job (optional)</label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {jobOptions.map((o) => (
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
        {pending ? "Saving…" : "Save expense"}
      </Button>
    </form>
  );
}
