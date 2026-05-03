"use client";

import { type FormEvent, useState, useTransition } from "react";
import { upsertOwnerProfile } from "@/server/actions/owner-profile";
import { uploadOwnerProfileDocument } from "@/server/actions/owner-profile-upload";
import type { OwnerContractType } from "@/lib/owner/contract";
import { ownershipScopeLabel } from "@/lib/owner/ownership-scope";
import { Button } from "@/components/ui/button";

export type OwnerProfileFormInitial = {
  ownerType: string;
  whatsAppPhone: string;
  addressLine: string;
  notes: string;
  qidNumber: string;
  qidExpiry: string;
  qidPhotoUrl: string;
  commercialRegistrationNumber: string;
  crDocumentUrl: string;
  defaultOwnerContractType: OwnerContractType;
  ownershipScope: string;
};

type Props = {
  ownerUserId: string;
  initial: OwnerProfileFormInitial;
};

export function AdminOwnerProfileForm({ ownerUserId, initial }: Props) {
  const [pending, start] = useTransition();
  const [uploadBusy, setUploadBusy] = useState<"qid" | "cr" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ownerType, setOwnerType] = useState(initial.ownerType);
  const [whatsAppPhone, setWhatsAppPhone] = useState(initial.whatsAppPhone);
  const [addressLine, setAddressLine] = useState(initial.addressLine);
  const [notes, setNotes] = useState(initial.notes);
  const [qidNumber, setQidNumber] = useState(initial.qidNumber);
  const [qidExpiry, setQidExpiry] = useState(initial.qidExpiry);
  const [qidPhotoUrl, setQidPhotoUrl] = useState(initial.qidPhotoUrl);
  const [commercialRegistrationNumber, setCommercialRegistrationNumber] = useState(
    initial.commercialRegistrationNumber
  );
  const [crDocumentUrl, setCrDocumentUrl] = useState(initial.crDocumentUrl);
  const [defaultOwnerContractType, setDefaultOwnerContractType] = useState<OwnerContractType>(
    initial.defaultOwnerContractType
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await upsertOwnerProfile({
        ownerUserId,
        ownerType,
        whatsAppPhone,
        addressLine,
        notes,
        qidNumber,
        qidExpiry: qidExpiry || undefined,
        qidPhotoUrl,
        commercialRegistrationNumber,
        crDocumentUrl,
        defaultOwnerContractType
      });
      if (!res.ok) {
        setMessage(res.error === "not_owner" ? "Not an owner account." : "Could not save profile.");
        return;
      }
      setMessage("Profile saved.");
    });
  };

  const upload = async (kind: "qid_photo" | "cr_document", file: File | null) => {
    if (!file) return;
    setUploadBusy(kind === "qid_photo" ? "qid" : "cr");
    setMessage(null);
    const fd = new FormData();
    fd.set("ownerUserId", ownerUserId);
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await uploadOwnerProfileDocument(fd);
    setUploadBusy(null);
    if (!res.ok) {
      setMessage("Upload failed.");
      return;
    }
    if (kind === "qid_photo") {
      setQidPhotoUrl(res.url);
    } else {
      setCrDocumentUrl(res.url);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold tracking-tight">Owner identity &amp; documents</h2>
      <p className="text-sm text-muted-foreground">
        Default contract type is used as a reference for new building assignments; each building still has its own
        operator/managed setting.
      </p>

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Ownership scope (from onboarding): </span>
        <span className="font-medium text-foreground">{ownershipScopeLabel(initial.ownershipScope)}</span>
      </div>

      <div>
        <label className="text-sm font-medium">Owner type</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value)}
        >
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">WhatsApp</label>
        <input
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={whatsAppPhone}
          onChange={(e) => setWhatsAppPhone(e.target.value)}
          placeholder="+974 …"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Address</label>
        <textarea
          className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {ownerType === "individual" ? (
        <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Individual — QID</legend>
          <div>
            <label className="text-sm font-medium">QID number</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={qidNumber}
              onChange={(e) => setQidNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">QID expiry</label>
            <input
              type="date"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={qidExpiry}
              onChange={(e) => setQidExpiry(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">QID photo URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-xs"
              value={qidPhotoUrl}
              onChange={(e) => setQidPhotoUrl(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-2 text-xs"
              disabled={uploadBusy !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void upload("qid_photo", f ?? null);
              }}
            />
            {uploadBusy === "qid" ? <span className="ml-2 text-xs text-muted-foreground">Uploading…</span> : null}
          </div>
        </fieldset>
      ) : (
        <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Company — CR</legend>
          <div>
            <label className="text-sm font-medium">Commercial registration (CR) number</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={commercialRegistrationNumber}
              onChange={(e) => setCommercialRegistrationNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">CR document URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-xs"
              value={crDocumentUrl}
              onChange={(e) => setCrDocumentUrl(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-2 text-xs"
              disabled={uploadBusy !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void upload("cr_document", f ?? null);
              }}
            />
            {uploadBusy === "cr" ? <span className="ml-2 text-xs text-muted-foreground">Uploading…</span> : null}
          </div>
        </fieldset>
      )}

      <div>
        <label className="text-sm font-medium">Default owner contract type</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={defaultOwnerContractType}
          onChange={(e) => setDefaultOwnerContractType(e.target.value as OwnerContractType)}
        >
          <option value="managed">Managed</option>
          <option value="operator">Operator / fixed lease</option>
        </select>
      </div>

      {message ? (
        <p className={`text-sm ${message === "Profile saved." ? "text-emerald-700" : "text-destructive"}`}>{message}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save owner profile"}
      </Button>
    </form>
  );
}
