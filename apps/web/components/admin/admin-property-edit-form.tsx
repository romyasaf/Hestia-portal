"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { updatePropertyStructuredAddress } from "@/server/actions/admin-entities";
import type { OwnerContractType } from "@/lib/owner/contract";
import { Button } from "@/components/ui/button";

export type AdminPropertyEditInitial = {
  id: string;
  code: string;
  name: string;
  addressZone: string;
  addressStreet: string;
  addressBuildingNumber: string;
  addressAreaName: string | null;
  addressNotes: string | null;
  city: string;
  country: string;
  googleMapsUrl: string | null;
  ownerUserId: string | null;
  ownerContractType: string;
};

type OwnerOpt = { id: string; label: string };

export function AdminPropertyEditForm({
  property,
  ownerOptions
}: {
  property: AdminPropertyEditInitial;
  ownerOptions: OwnerOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(property.name);
  const [city, setCity] = useState(property.city);
  const [country, setCountry] = useState(property.country);
  const [addressZone, setAddressZone] = useState(property.addressZone);
  const [addressStreet, setAddressStreet] = useState(property.addressStreet);
  const [addressBuildingNumber, setAddressBuildingNumber] = useState(property.addressBuildingNumber);
  const [addressAreaName, setAddressAreaName] = useState(property.addressAreaName ?? "");
  const [addressNotes, setAddressNotes] = useState(property.addressNotes ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(property.googleMapsUrl ?? "");
  const [ownerUserId, setOwnerUserId] = useState(property.ownerUserId ?? "");
  const [ownerContractType, setOwnerContractType] = useState<OwnerContractType>(
    property.ownerContractType === "operator" ? "operator" : "managed"
  );

  const hasOwner = Boolean(ownerUserId.trim());

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await updatePropertyStructuredAddress({
        propertyId: property.id,
        name,
        addressZone,
        addressStreet,
        addressBuildingNumber,
        city,
        country: country.trim() || "Qatar",
        addressAreaName: addressAreaName.trim() || undefined,
        addressNotes: addressNotes.trim() || undefined,
        googleMapsUrl,
        ownerUserId: ownerUserId.trim() || "",
        ownerContractType: hasOwner ? ownerContractType : undefined
      });
      if (!res.ok) {
        setMessage(
          res.error === "missing_fields"
            ? "Fill in name, city, zone, street, and building number."
            : res.error === "field_too_long"
              ? "A field is too long."
            : res.error === "invalid_property"
              ? "Building not found."
              : res.error === "owner_must_have_role"
                ? "Selected user must have the owner role."
                : "Could not save."
        );
        return;
      }
      router.push("/admin/properties");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
      <p className="text-xs text-muted-foreground">
        Building code <span className="font-mono font-medium text-foreground">{property.code}</span> cannot be
        changed here.
      </p>
      <div>
        <label className="text-sm font-medium">Building name</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
        <legend className="px-1 text-sm font-semibold">Address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">City</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Zone</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressZone}
              onChange={(e) => setAddressZone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Street</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Building number</label>
            <input
              required
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressBuildingNumber}
              onChange={(e) => setAddressBuildingNumber(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Area name (optional)</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addressAreaName}
              onChange={(e) => setAddressAreaName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Location notes (optional)</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Google Maps link (optional)</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Country</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="text-sm font-medium">Building owner (optional)</label>
        {ownerOptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No owner-role users yet.{" "}
            <Link href="/admin/owners/new" className="font-medium text-primary hover:underline">
              Create an owner
            </Link>
            .
          </p>
        ) : (
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
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
            <label className="text-sm font-medium">Owner contract type</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ownerContractType}
              onChange={(e) => setOwnerContractType(e.target.value as OwnerContractType)}
            >
              <option value="managed">Managed</option>
              <option value="operator">Operator / fixed lease</option>
            </select>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save building"}
      </Button>
    </form>
  );
}
