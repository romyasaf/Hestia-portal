"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { tenantRequestStatusLabel } from "@/lib/tenant-requests/statuses";
import { updateTenantRequestStatus } from "@/server/actions/tenant-requests";
import { Button } from "@/components/ui/button";

type Props = {
  jobId: string;
  nextStatuses: string[];
};

export function TenantRequestStatusControls({ jobId, nextStatuses }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (nextStatuses.length === 0) {
    return null;
  }

  const onMove = (nextStatus: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateTenantRequestStatus({ jobId, nextStatus });
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_transition: "That status change is not allowed.",
          already_final: "This request is already closed.",
          not_found: "Request not found.",
          forbidden: "You are not allowed to update this request.",
          no_change: "Pick a different status."
        };
        setMessage(map[res.error] ?? "Update failed.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Update status</h3>
      <p className="mt-1 text-xs text-muted-foreground">Allowed transitions for your role.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatuses.map((s) => (
          <Button key={s} type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onMove(s)}>
            {tenantRequestStatusLabel(s)}
          </Button>
        ))}
      </div>
      {message ? <p className="mt-2 text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
