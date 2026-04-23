"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createUnit, updateUnit } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type PropOpt = { id: string; label: string };
type OwnerOpt = { id: string; label: string };

type Props = {
  properties: PropOpt[];
  ownerOptions: OwnerOpt[];
  unitId?: string;
  initial?: {
    propertyId: string;
    unitNumber: string;
    unitType: string;
    bedrooms: string;
    bathrooms: string;
    monthlyRent: string;
    status: string;
    /** Direct unit owner user id, or "" for none / inherit from building only. */
    unitOwnerUserId: string;
  };
};

export function AdminUnitForm({ properties, ownerOptions, unitId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? properties[0]?.id ?? "");
  const [unitOwnerUserId, setUnitOwnerUserId] = useState(initial?.unitOwnerUserId ?? "");
  const [unitNumber, setUnitNumber] = useState(initial?.unitNumber ?? "");
  const [unitType, setUnitType] = useState(initial?.unitType ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms ?? "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms ?? "");
  const [monthlyRent, setMonthlyRent] = useState(initial?.monthlyRent ?? "");
  const [status, setStatus] = useState(initial?.status ?? "available");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = unitId
        ? await updateUnit({
            unitId,
            propertyId,
            unitNumber,
            unitType,
            bedrooms,
            bathrooms,
            monthlyRent,
            status,
            unitOwnerUserId
          })
        : await createUnit({
            propertyId,
            unitNumber,
            unitType,
            bedrooms,
            bathrooms,
            monthlyRent,
            status,
            unitOwnerUserId: unitOwnerUserId.trim() || undefined
          });
      if (!res.ok) {
        setMessage(
          res.error === "duplicate_unit"
            ? "Unit number already exists for this building."
            : res.error === "unit_owner_must_have_role"
              ? "The selected direct owner must have the owner role."
              : res.error === "invalid_property"
                ? "Choose a valid building."
                : "Save failed."
        );
        return;
      }
      if (unitId) {
        setMessage("Saved.");
        router.refresh();
      } else {
        router.push("/admin/units");
        router.refresh();
      }
    });
  };

  if (properties.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Create a building first, then add units under it.</p>
        <p>
          <a href="/admin/properties/new" className="font-medium text-primary hover:underline">
            New building
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Building</label>
        <select
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Direct unit owner (optional)</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={unitOwnerUserId}
          onChange={(e) => setUnitOwnerUserId(e.target.value)}
        >
          <option value="">— None — use building owner if set</option>
          {ownerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          If set, this owner applies to this unit only and overrides the building-level owner for ownership resolution.
        </p>
        {ownerOptions.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            No owner-role users yet.{" "}
            <a href="/admin/owners/new" className="font-medium text-primary hover:underline">
              Create owner
            </a>
          </p>
        ) : null}
      </div>
      <div>
        <label className="text-sm font-medium">Unit number</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Unit type</label>
        <input
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={unitType}
          onChange={(e) => setUnitType(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Bedrooms</label>
          <input
            type="number"
            min={0}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Bathrooms</label>
          <input
            type="number"
            min={0}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Monthly rent</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["available", "occupied", "reserved", "maintenance", "inactive"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {unitId ? "Save unit" : "Create unit"}
      </Button>
    </form>
  );
}
