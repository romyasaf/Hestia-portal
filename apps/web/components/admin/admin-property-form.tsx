"use client";

import type { OwnerContractType } from "@/lib/owner/contract";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createProperty } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type OwnerOpt = { id: string; label: string };

type Props = {
  ownerOptions: OwnerOpt[];
};

export function AdminPropertyForm({ ownerOptions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Qatar");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [ownerContractType, setOwnerContractType] = useState<OwnerContractType>("managed");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const oid = ownerUserId.trim();
      const res = await createProperty({
        code,
        name,
        addressLine1,
        city,
        country: country.trim() || "Qatar",
        ...(oid ? { ownerUserId: oid, ownerContractType } : {})
      });
      if (!res.ok) {
        setMessage(
          res.error === "duplicate_code"
            ? "Building code already exists — use a unique code."
            : res.error === "owner_must_have_role"
              ? "Selected user must have the owner role."
              : res.error === "missing_fields"
                ? "Fill in code, name, address, and city."
                : res.error === "field_too_long"
                  ? "Code or name is too long (code max 64, name max 200 characters)."
                  : "Could not create building."
        );
        return;
      }
      router.push("/admin/properties");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Building code</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. PEARL-01"
        />
        <p className="mt-1 text-xs text-muted-foreground">Unique short code (stored uppercase).</p>
      </div>
      <div>
        <label className="text-sm font-medium">Building name</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Address line 1</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">City</label>
          <input
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Country</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Building-level owner (optional)</label>
        {ownerOptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No owner-role users yet.{" "}
            <a href="/admin/owners/new" className="font-medium text-primary hover:underline">
              Create owner
            </a>{" "}
            to assign later on the buildings list.
          </p>
        ) : (
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
          >
            <option value="">— None — units may use direct owners instead</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {ownerUserId.trim() ? (
          <div className="mt-3">
            <label className="text-sm font-medium">Building-level owner contract</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ownerContractType}
              onChange={(e) => setOwnerContractType(e.target.value as OwnerContractType)}
            >
              <option value="managed">Managed — full owner portal on this building</option>
              <option value="operator">Operator (fixed lease) — landlord to company; restricted portal</option>
            </select>
          </div>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Ownership can be set here for the whole building, on individual units, or both (unit owner overrides for that
          unit).
        </p>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create building"}
      </Button>
    </form>
  );
}
