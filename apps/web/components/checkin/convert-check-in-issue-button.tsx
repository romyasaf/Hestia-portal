"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTicketFromCheckInIssue } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type Props = { issueId: string; disabled?: boolean };

export function ConvertCheckInIssueButton({ issueId, disabled }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-2 space-y-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const res = await createTicketFromCheckInIssue({ checkInIssueId: issueId });
            if (!res.ok) {
              const map: Record<string, string> = {
                already_converted: "Already linked to a ticket.",
                check_in_closed: "Check-in is closed.",
                not_found: "Issue not found."
              };
              setMsg(map[res.error] ?? "Could not create ticket.");
              return;
            }
            if (!("ticketId" in res)) {
              setMsg("Could not create ticket.");
              return;
            }
            router.push(`/admin/maintenance/${res.ticketId}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Creating…" : "Convert to maintenance ticket"}
      </Button>
      {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
    </div>
  );
}
