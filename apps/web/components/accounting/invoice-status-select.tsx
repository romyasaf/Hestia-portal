"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { INVOICE_PAYMENT_STATUSES, invoicePaymentLabel } from "@/lib/accounting/statuses";
import { updateInvoicePaymentStatusAdmin } from "@/server/actions/accounting";

type Props = { invoiceId: string; value: string };

export function InvoiceStatusSelect({ invoiceId, value }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      disabled={pending}
      defaultValue={value}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateInvoicePaymentStatusAdmin({ invoiceId, paymentStatus: next });
          router.refresh();
        });
      }}
      className="h-8 max-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
    >
      {INVOICE_PAYMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {invoicePaymentLabel(s)}
        </option>
      ))}
    </select>
  );
}
