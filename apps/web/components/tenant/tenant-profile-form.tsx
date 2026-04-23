"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateMyProfile } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";

type Props = {
  initialFullName: string;
  initialPhone: string | null;
};

export function TenantProfileForm({ initialFullName, initialPhone }: Props) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateMyProfile({ fullName, phone: phone.trim() || null });
      if (!res.ok) {
        setMessage("Could not save. Check your name and try again.");
        return;
      }
      setMessage("Saved.");
    });
  };

  return (
    <form className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="tp-name">
          Full name
        </label>
        <input
          id="tp-name"
          required
          value={fullName}
          onChange={(ev) => setFullName(ev.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="tp-phone">
          Phone
        </label>
        <input
          id="tp-phone"
          type="tel"
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
