"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RECEIPT_PAYMENT_STATUSES, receiptPaymentLabel } from "@/lib/accounting/statuses";
import { updateReceiptPaymentStatus } from "@/server/actions/accounting";

type Props = { receiptId: string; value: string };

export function ReceiptStatusSelect({ receiptId, value }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      disabled={pending}
      defaultValue={value}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateReceiptPaymentStatus({ receiptId, paymentStatus: next });
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      {RECEIPT_PAYMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {receiptPaymentLabel(s)}
        </option>
      ))}
    </select>
  );
}
