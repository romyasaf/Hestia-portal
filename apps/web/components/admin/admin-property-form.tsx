"use client";

import type { OwnerContractType } from "@/lib/owner/contract";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createProperty } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type OwnerOpt = { id: string; label: string };

type Props = {
  ownerOptions: OwnerOpt[];
};

export function AdminPropertyForm({ ownerOptions }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Doha");
  const [addressZone, setAddressZone] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressBuildingNumber, setAddressBuildingNumber] = useState("");
  const [addressAreaName, setAddressAreaName] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [ownerContractType, setOwnerContractType] = useState<OwnerContractType>("managed");

  const hasOwner = Boolean(ownerUserId.trim());

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setMessage(null);
    setIsSubmitting(true);
    try {
      const oid = ownerUserId.trim();
      const res = await createProperty({
        name: name.trim(),
        addressZone,
        addressStreet,
        addressBuildingNumber,
        city: city.trim(),
        country: "Qatar",
        addressAreaName: addressAreaName.trim() || undefined,
        addressNotes: addressNotes.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        ...(oid ? { ownerUserId: oid, ownerContractType } : {})
      });
      if (!res.ok) {
        setMessage(
          res.error === "duplicate_code"
            ? "Could not assign a unique building code — try a slightly different name and save again."
            : res.error === "code_alloc_failed"
              ? "Could not generate a unique code. Try again."
              : res.error === "owner_must_have_role"
                ? "That user must have the owner role."
                : res.error === "missing_fields"
                  ? "Fill in building name, city, zone, street, and building number."
                  : res.error === "field_too_long"
                    ? "A field is too long (address parts max 128 characters)."
                    : "Could not create building."
        );
        setIsSubmitting(false);
        return;
      }
      router.push("/admin/properties");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium" htmlFor="building-name">
          Building name
        </label>
        <input
          id="building-name"
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. West Bay Tower A"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-muted-foreground">A short internal code is created automatically from this name.</p>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
        <legend className="px-1 text-sm font-semibold">Address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addr-city">
              City
            </label>
            <input
              id="addr-city"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="addr-zone">
              Zone
            </label>
            <input
              id="addr-zone"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressZone}
              onChange={(e) => setAddressZone(e.target.value)}
              placeholder="e.g. 66"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="addr-street">
              Street
            </label>
            <input
              id="addr-street"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              placeholder="e.g. 850"
              disabled={isSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addr-bldg">
              Building number
            </label>
            <input
              id="addr-bldg"
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressBuildingNumber}
              onChange={(e) => setAddressBuildingNumber(e.target.value)}
              placeholder="e.g. 23"
              disabled={isSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addr-area">
              Area name (optional)
            </label>
            <input
              id="addr-area"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressAreaName}
              onChange={(e) => setAddressAreaName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addr-notes">
              Location notes (optional)
            </label>
            <textarea
              id="addr-notes"
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addr-maps">
              Google Maps link (optional)
            </label>
            <input
              id="addr-maps"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/…"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="text-sm font-medium" htmlFor="building-owner">
          Building owner (optional)
        </label>
        {ownerOptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No owner-role users yet.{" "}
            <Link href="/admin/owners/new" className="font-medium text-primary hover:underline">
              Create an owner
            </Link>{" "}
            if you need one now; you can also leave this empty and assign later.
          </p>
        ) : (
          <select
            id="building-owner"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">— None —</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {hasOwner ? (
          <div className="mt-3">
            <label className="text-sm font-medium" htmlFor="owner-contract-type">
              Owner contract type
            </label>
            <select
              id="owner-contract-type"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ownerContractType}
              onChange={(e) => setOwnerContractType(e.target.value as OwnerContractType)}
              disabled={isSubmitting}
            >
              <option value="managed">Managed</option>
              <option value="operator">Operator</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Managed: typical management agreement. Operator: fixed-lease / operator arrangement.
            </p>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save building"}
      </Button>
    </form>
  );
}
