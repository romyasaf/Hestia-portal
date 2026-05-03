"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createTenantUser, updateTenantUser, type CreateTenantUserResult } from "@/server/actions/admin-entities";
import { TENANT_TYPES, normalizeTenantType, tenantTypeLabel, type TenantType } from "@/lib/tenants/constants";
import { Button } from "@/components/ui/button";

type Props = {
  userId?: string;
  initial?: { email: string; fullName: string; phone: string; isActive: boolean };
};

export function AdminTenantForm({ userId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tenantType, setTenantType] = useState<TenantType>("individual");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const nameLabel = userId
    ? "Display / legal name"
    : tenantType === "company"
      ? "Company name"
      : "Full name (legal)";

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
        router.push("/admin/tenants");
        router.refresh();
      } else {
        if (password.length < 8) {
          setMessage("Password must be at least 8 characters.");
          return;
        }
        const res: CreateTenantUserResult = await createTenantUser({
          email,
          password,
          fullName,
          phone,
          tenantType
        });
        if (!res.ok) {
          setMessage(
            res.error === "email_in_use"
              ? "Email already in use."
              : res.error === "no_tenant_role"
                ? "Tenant role missing in database."
                : res.error === "database_schema_outdated"
                  ? "Database is missing required tables (e.g. tenant_profiles). Apply repo migrations 018 and 020, then try again."
                  : "Could not create tenant."
          );
          return;
        }
        router.push(`/admin/tenants/${res.userId}`);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold tracking-tight">Account</h2>
      <p className="text-sm text-muted-foreground">Login email, phone, and name shown across the admin portal.</p>

      {!userId ? (
        <div>
          <label className="text-sm font-medium">Tenant type</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={tenantType}
            onChange={(e) => setTenantType(normalizeTenantType(e.target.value))}
          >
            {TENANT_TYPES.map((t) => (
              <option key={t} value={t}>
                {tenantTypeLabel(t)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            After creation you&apos;ll land on the tenant page to complete profile details (QID vs CR) under Tenant
            profile.
          </p>
        </div>
      ) : null}

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
        <label className="text-sm font-medium">{nameLabel}</label>
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
        {userId ? "Save account" : "Create tenant"}
      </Button>
    </form>
  );
}
