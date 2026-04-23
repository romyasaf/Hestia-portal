"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateLeadInquiryStatus } from "@/server/actions/admin-inquiries";
import type { LeadInquiryStatus } from "@/lib/inquiries/constants";
import { LEAD_INQUIRY_STATUSES } from "@/lib/inquiries/constants";
import { Button } from "@/components/ui/button";

type Props = { id: string; currentStatus: LeadInquiryStatus };

export function AdminInquiryStatusForm({ id, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setStatus = (status: LeadInquiryStatus) => {
    startTransition(async () => {
      const res = await updateLeadInquiryStatus({ id, status });
      if (res.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase text-muted-foreground">Status</span>
      {LEAD_INQUIRY_STATUSES.map((s) => (
        <Button
          key={s}
          type="button"
          size="sm"
          variant={currentStatus === s ? "default" : "outline"}
          disabled={pending || currentStatus === s}
          className="h-8 text-xs"
          onClick={() => setStatus(s)}
        >
          {s.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}
