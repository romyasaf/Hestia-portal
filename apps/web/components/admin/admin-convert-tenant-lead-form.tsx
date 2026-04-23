"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { convertTenantLeadInquiry } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

export function AdminConvertTenantLeadForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-4 space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await convertTenantLeadInquiry({ leadId, password });
          if (!res.ok) {
            setMsg(
              res.error === "email_in_use"
                ? "A user with this email already exists."
                : res.error === "already_converted"
                  ? "Already converted."
                  : res.error === "wrong_inquiry_type"
                    ? "Only tenant inquiries can become tenant users."
                    : res.error === "missing_or_weak_password"
                      ? "Password must be at least 8 characters."
                      : "Conversion failed."
            );
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-xs font-medium text-foreground">Create tenant portal login from this lead</p>
      <input
        type="password"
        required
        minLength={8}
        placeholder="Initial password for new tenant"
        className="mt-1 flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Creating…" : "Convert to tenant user"}
      </Button>
    </form>
  );
}
