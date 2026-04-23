"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createTenantUser, updateTenantUser } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type Props = {
  userId?: string;
  initial?: { email: string; fullName: string; phone: string; isActive: boolean };
};

export function AdminTenantForm({ userId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (userId) {
        const res = await updateTenantUser({ userId, email, fullName, phone, isActive });
        if (!res.ok) {
          setMessage("Could not update tenant.");
          return;
        }
      } else {
        if (password.length < 8) {
          setMessage("Password must be at least 8 characters.");
          return;
        }
        const res = await createTenantUser({ email, password, fullName, phone });
        if (!res.ok) {
          setMessage(
            res.error === "email_in_use"
              ? "Email already in use."
              : res.error === "no_tenant_role"
                ? "Tenant role missing in database."
                : "Could not create tenant."
          );
          return;
        }
      }
      router.push("/admin/tenants");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Full name</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Phone</label>
        <input
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {!userId ? (
        <div>
          <label className="text-sm font-medium">Initial password</label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (login allowed)
        </label>
      )}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {userId ? "Save tenant" : "Create tenant"}
      </Button>
    </form>
  );
}
