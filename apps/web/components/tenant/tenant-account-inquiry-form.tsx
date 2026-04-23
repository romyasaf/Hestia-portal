"use client";

import { useState, useTransition } from "react";
import { submitTenantLeaseInquiryFromPortal } from "@/server/actions/tenant-onboarding";
import { Button } from "@/components/ui/button";

export function TenantAccountInquiryForm() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        setDone(null);
        start(async () => {
          const res = await submitTenantLeaseInquiryFromPortal({ message });
          if (!res.ok) {
            setErr(res.error === "missing_message" ? "Please enter at least a few sentences." : "Could not send.");
            return;
          }
          setMessage("");
          setDone("Thanks — the team will follow up.");
        });
      }}
    >
      <textarea
        required
        minLength={8}
        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="What unit or building are you interested in?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {done ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{done}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
