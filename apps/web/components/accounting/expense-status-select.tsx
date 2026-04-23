"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EXPENSE_PAYMENT_STATUSES, expensePaymentLabel } from "@/lib/accounting/statuses";
import { updateExpensePaymentStatus } from "@/server/actions/accounting";

type Props = { expenseId: string; value: string };

export function ExpenseStatusSelect({ expenseId, value }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      disabled={pending}
      defaultValue={value}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateExpensePaymentStatus({ expenseId, paymentStatus: next });
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      {EXPENSE_PAYMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {expensePaymentLabel(s)}
        </option>
      ))}
    </select>
  );
}
