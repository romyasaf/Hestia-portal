"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createOwnerUser } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type PropertyOpt = { id: string; label: string };

export function AdminOwnerForm({ propertyOptions }: { propertyOptions: PropertyOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        return;
      }
      const res = await createOwnerUser({
        email,
        password,
        fullName,
        phone,
        propertyId: propertyId.trim() || undefined
      });
      if (!res.ok) {
        setMessage(
          res.error === "email_in_use"
            ? "Email already in use."
            : res.error === "no_owner_role"
              ? "Owner role missing in database (run role seeds)."
              : res.error === "invalid_property"
                ? "Selected building is no longer valid — refresh the page."
                : "Could not create owner."
        );
        return;
      }
      router.push("/admin/portfolio?tab=owners");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Creates a user with the <strong className="text-foreground">owner</strong> role so they can sign in to the
        owner portal. Optionally set them as building-level owner on a building now, or assign later under{" "}
        <span className="font-medium text-foreground">Buildings</span>.
      </p>
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
      <div>
        <label className="text-sm font-medium">Set as building-level owner (optional)</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">— none —</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {propertyOptions.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            No buildings yet.{" "}
            <a href="/admin/properties/new" className="font-medium text-primary hover:underline">
              Create a building
            </a>{" "}
            first, or assign this owner later from the buildings list.
          </p>
        ) : null}
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create owner"}
      </Button>
    </form>
  );
}
