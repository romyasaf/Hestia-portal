"use client";

import { type FormEvent, useState, useTransition } from "react";
import { upsertTenantProfile } from "@/server/actions/tenant-profile";
import { uploadTenantProfileDocument } from "@/server/actions/tenant-profile-upload";
import {
  TENANT_LIFECYCLE_STATUSES,
  TENANT_TYPES,
  normalizeTenantLifecycleStatus,
  normalizeTenantType,
  tenantTypeLabel,
  type TenantLifecycleStatus,
  type TenantType
} from "@/lib/tenants/constants";
import { Button } from "@/components/ui/button";

export type TenantProfileFormInitial = {
  tenantType: string;
  tenantLifecycleStatus: string;
  whatsAppPhone: string;
  nationality: string;
  qidNumber: string;
  qidExpiry: string;
  qidPhotoUrl: string;
  passportNumber: string;
  passportPhotoUrl: string;
  dateOfBirth: string;
  companyName: string;
  contactPersonName: string;
  commercialRegistrationNumber: string;
  crDocumentUrl: string;
  companyAddress: string;
  authorizedSignatory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
};

type Props = {
  tenantUserId: string;
  initial: TenantProfileFormInitial;
};

export function AdminTenantProfileForm({ tenantUserId, initial }: Props) {
  const [pending, start] = useTransition();
  const [uploadBusy, setUploadBusy] = useState<"qid" | "passport" | "cr" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [tenantType, setTenantType] = useState<TenantType>(normalizeTenantType(initial.tenantType));
  const [tenantLifecycleStatus, setTenantLifecycleStatus] = useState<TenantLifecycleStatus>(
    normalizeTenantLifecycleStatus(initial.tenantLifecycleStatus)
  );
  const [whatsAppPhone, setWhatsAppPhone] = useState(initial.whatsAppPhone);
  const [nationality, setNationality] = useState(initial.nationality);
  const [qidNumber, setQidNumber] = useState(initial.qidNumber);
  const [qidExpiry, setQidExpiry] = useState(initial.qidExpiry);
  const [qidPhotoUrl, setQidPhotoUrl] = useState(initial.qidPhotoUrl);
  const [passportNumber, setPassportNumber] = useState(initial.passportNumber);
  const [passportPhotoUrl, setPassportPhotoUrl] = useState(initial.passportPhotoUrl);
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [contactPersonName, setContactPersonName] = useState(initial.contactPersonName);
  const [commercialRegistrationNumber, setCommercialRegistrationNumber] = useState(
    initial.commercialRegistrationNumber
  );
  const [crDocumentUrl, setCrDocumentUrl] = useState(initial.crDocumentUrl);
  const [companyAddress, setCompanyAddress] = useState(initial.companyAddress);
  const [authorizedSignatory, setAuthorizedSignatory] = useState(initial.authorizedSignatory);
  const [emergencyContactName, setEmergencyContactName] = useState(initial.emergencyContactName);
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initial.emergencyContactPhone);
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(
    initial.emergencyContactRelationship
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await upsertTenantProfile({
        tenantUserId,
        tenantType,
        tenantLifecycleStatus,
        whatsAppPhone,
        nationality: tenantType === "individual" ? nationality : undefined,
        qidNumber: tenantType === "individual" ? qidNumber : undefined,
        qidExpiry: tenantType === "individual" ? qidExpiry || undefined : undefined,
        qidPhotoUrl: tenantType === "individual" ? qidPhotoUrl : undefined,
        passportNumber: tenantType === "individual" ? passportNumber : undefined,
        passportPhotoUrl: tenantType === "individual" ? passportPhotoUrl : undefined,
        dateOfBirth: tenantType === "individual" ? dateOfBirth || undefined : undefined,
        companyName: tenantType === "company" ? companyName : undefined,
        contactPersonName: tenantType === "company" ? contactPersonName : undefined,
        commercialRegistrationNumber: tenantType === "company" ? commercialRegistrationNumber : undefined,
        crDocumentUrl: tenantType === "company" ? crDocumentUrl : undefined,
        companyAddress: tenantType === "company" ? companyAddress : undefined,
        authorizedSignatory: tenantType === "company" ? authorizedSignatory : undefined,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship
      });
      if (!res.ok) {
        setMessage(res.error === "not_tenant" ? "Not a tenant account." : "Could not save profile.");
        return;
      }
      setMessage("Profile saved.");
    });
  };

  const upload = async (kind: "qid_photo" | "passport_photo" | "cr_document", file: File | null) => {
    if (!file) return;
    setUploadBusy(kind === "qid_photo" ? "qid" : kind === "passport_photo" ? "passport" : "cr");
    setMessage(null);
    const fd = new FormData();
    fd.set("tenantUserId", tenantUserId);
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await uploadTenantProfileDocument(fd);
    setUploadBusy(null);
    if (!res.ok) {
      setMessage("Upload failed.");
      return;
    }
    if (kind === "qid_photo") {
      setQidPhotoUrl(res.url);
    } else if (kind === "passport_photo") {
      setPassportPhotoUrl(res.url);
    } else {
      setCrDocumentUrl(res.url);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tenant profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose tenant type first — QID and passport fields apply only to individuals; CR fields only to companies.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div>
          <label className="text-sm font-medium">Tenant status</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={tenantLifecycleStatus}
            onChange={(e) => setTenantLifecycleStatus(normalizeTenantLifecycleStatus(e.target.value))}
          >
            {TENANT_LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "lead_pending" ? "Lead / pending lease" : s === "previous" ? "Previous tenant" : "Active tenant"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
        <legend className="px-1 text-sm font-semibold">Contact (both types)</legend>
        <div>
          <label className="text-sm font-medium">WhatsApp</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={whatsAppPhone}
            onChange={(e) => setWhatsAppPhone(e.target.value)}
            placeholder="If different from phone"
          />
        </div>
      </fieldset>

      {tenantType === "individual" ? (
        <fieldset className="space-y-4 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Individual — identity (QID optional)</legend>
          <p className="text-xs text-muted-foreground">
            Legal name is edited under <strong className="text-foreground">Account</strong> above. QID fields are not
            required unless your process needs them.
          </p>
          <div>
            <label className="text-sm font-medium">Nationality</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <div>
            <label className="text-sm font-medium">QID photo</label>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Passport number (optional)</label>
              <input
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date of birth (optional)</label>
              <input
                type="date"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Passport photo (optional)</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-xs"
              value={passportPhotoUrl}
              onChange={(e) => setPassportPhotoUrl(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-2 text-xs"
              disabled={uploadBusy !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void upload("passport_photo", f ?? null);
              }}
            />
            {uploadBusy === "passport" ? <span className="ml-2 text-xs text-muted-foreground">Uploading…</span> : null}
          </div>
        </fieldset>
      ) : (
        <fieldset className="space-y-4 rounded-lg border border-border/80 p-4">
          <legend className="px-1 text-sm font-semibold">Company</legend>
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Legal or trading name"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Saving updates the portal display name when company name is filled.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Contact person name</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Commercial registration (CR) number</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={commercialRegistrationNumber}
              onChange={(e) => setCommercialRegistrationNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">CR document</label>
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
          <div>
            <label className="text-sm font-medium">Company address (optional)</label>
            <textarea
              className="mt-1 min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Authorized signatory (optional)</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={authorizedSignatory}
              onChange={(e) => setAuthorizedSignatory(e.target.value)}
            />
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
        <legend className="px-1 text-sm font-semibold">Emergency contact</legend>
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Relationship (optional)</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={emergencyContactRelationship}
            onChange={(e) => setEmergencyContactRelationship(e.target.value)}
          />
        </div>
      </fieldset>

      {message ? (
        <p className={`text-sm ${message === "Profile saved." ? "text-emerald-700" : "text-destructive"}`}>{message}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save tenant profile"}
      </Button>
    </form>
  );
}
