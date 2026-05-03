"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { updateUnitListing } from "@/server/actions/admin-entities";
import { uploadUnitListingImage } from "@/server/actions/unit-listing-upload";
import { LISTING_AMENITY_PRESETS } from "@/lib/units/listing-amenity-presets";
import { Button } from "@/components/ui/button";

type Props = {
  unitId: string;
  initial: {
    listingTitle: string;
    listingDescription: string;
    listingMonthlyPrice: string;
    listingCoverImageUrl: string;
    listingGalleryUrlsRaw: string;
    listingAmenitiesRaw: string;
    listingNotes: string;
    listingAvailabilityDate: string;
  };
};

function splitAmenities(raw: string): string[] {
  const parts = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

export function AdminUnitListingForm({ unitId, initial }: Props) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);

  const [listingTitle, setListingTitle] = useState(initial.listingTitle);
  const [listingDescription, setListingDescription] = useState(initial.listingDescription);
  const [listingMonthlyPrice, setListingMonthlyPrice] = useState(initial.listingMonthlyPrice);
  const [listingCoverImageUrl, setListingCoverImageUrl] = useState(initial.listingCoverImageUrl);
  const [listingGalleryUrlsRaw, setListingGalleryUrlsRaw] = useState(initial.listingGalleryUrlsRaw);
  const [amenities, setAmenities] = useState<string[]>(() => splitAmenities(initial.listingAmenitiesRaw));
  const [amenityDraft, setAmenityDraft] = useState("");
  const [listingNotes, setListingNotes] = useState(initial.listingNotes);
  const [listingAvailabilityDate, setListingAvailabilityDate] = useState(initial.listingAvailabilityDate);

  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    const i = JSON.parse(initialKey) as Props["initial"];
    setListingTitle(i.listingTitle);
    setListingDescription(i.listingDescription);
    setListingMonthlyPrice(i.listingMonthlyPrice);
    setListingCoverImageUrl(i.listingCoverImageUrl);
    setListingGalleryUrlsRaw(i.listingGalleryUrlsRaw);
    setAmenities(splitAmenities(i.listingAmenitiesRaw));
    setListingNotes(i.listingNotes);
    setListingAvailabilityDate(i.listingAvailabilityDate);
  }, [initialKey]);

  const onPickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage(null);
    setUploadBusy(true);
    const fd = new FormData();
    fd.set("unitId", unitId);
    fd.set("file", file);
    const res = await uploadUnitListingImage(fd);
    setUploadBusy(false);
    if (!res.ok) {
      setMsgOk(false);
      setMessage(
        res.error === "file_too_large"
          ? "Image must be 5MB or smaller."
          : res.error === "invalid_type"
            ? "Use JPEG, PNG, or WebP."
            : "Upload failed."
      );
      return;
    }
    setListingCoverImageUrl(res.url);
    setMsgOk(true);
    setMessage("Cover image uploaded.");
  };

  const onPickGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setMessage(null);
    setUploadBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("unitId", unitId);
      fd.set("file", file);
      const res = await uploadUnitListingImage(fd);
      if (!res.ok) {
        setUploadBusy(false);
        setMsgOk(false);
        setMessage(
          res.error === "file_too_large"
            ? "Each image must be 5MB or smaller."
            : res.error === "invalid_type"
              ? "Use JPEG, PNG, or WebP only."
              : "Upload failed."
        );
        return;
      }
      urls.push(res.url);
    }
    setUploadBusy(false);
    setListingGalleryUrlsRaw((prev) => [...splitGallery(prev), ...urls].join("\n"));
    setMsgOk(true);
    setMessage(urls.length === 1 ? "Gallery image added." : `${urls.length} gallery images added.`);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await updateUnitListing({
        unitId,
        listingTitle,
        listingDescription,
        listingMonthlyPrice,
        listingCoverImageUrl,
        listingGalleryUrlsRaw,
        listingAmenitiesRaw: amenities.join("\n"),
        listingNotes,
        listingAvailabilityDate
      });
      if (!res.ok) {
        setMsgOk(false);
        setMessage(
          res.error === "cover_url_too_long"
            ? "Cover image URL is too long."
            : res.error === "invalid_unit"
              ? "Unit not found."
              : "Save failed."
        );
        return;
      }
      setMsgOk(true);
      setMessage("Saved.");
      router.refresh();
    } catch {
      setMsgOk(false);
      setMessage("Save failed.");
    }
    setIsSubmitting(false);
  };

  const togglePreset = (label: string) => {
    const key = label.toLowerCase();
    setAmenities((prev) => {
      const has = prev.some((a) => a.toLowerCase() === key);
      if (has) {
        return prev.filter((a) => a.toLowerCase() !== key);
      }
      return [...prev, label];
    });
  };

  const addAmenityDraft = () => {
    const t = amenityDraft.trim();
    if (!t) return;
    setAmenities((prev) => {
      if (prev.some((a) => a.toLowerCase() === t.toLowerCase())) {
        return prev;
      }
      return [...prev, t];
    });
    setAmenityDraft("");
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Public listing copy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on the marketing site only when the unit has no active tenant lease and title, description, public price,
          and cover image are set. No manual publish toggle.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Listing title</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={listingTitle}
              onChange={(e) => setListingTitle(e.target.value)}
              placeholder="e.g. Bright 2BR in The Pearl"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Public description</label>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
              value={listingDescription}
              onChange={(e) => setListingDescription(e.target.value)}
              placeholder="Full description for prospective tenants…"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Monthly price (public)</label>
            <input
              className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm tabular-nums"
              value={listingMonthlyPrice}
              onChange={(e) => setListingMonthlyPrice(e.target.value)}
              placeholder="QAR — can match operational rent"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              If empty, operational monthly rent on Overview can still satisfy the price rule.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Availability date (optional)</label>
            <input
              type="date"
              className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
              value={listingAvailabilityDate}
              onChange={(e) => setListingAvailabilityDate(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">For marketing context only.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Internal listing notes (optional)</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={listingNotes}
              onChange={(e) => setListingNotes(e.target.value)}
              placeholder="Not shown on the public site"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Media</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload images (stored on this server under <code className="text-xs">/uploads</code>) or paste external
          HTTPS URLs below.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Cover image</label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickCover} />
              <Button
                type="button"
                variant="secondary"
                disabled={uploadBusy || isSubmitting}
                onClick={() => coverInputRef.current?.click()}
              >
                {uploadBusy ? "Uploading…" : "Upload cover"}
              </Button>
              {listingCoverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin arbitrary URLs + local uploads
                <img src={listingCoverImageUrl} alt="" className="h-16 w-24 rounded-md border object-cover" />
              ) : null}
            </div>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Or cover image URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={listingCoverImageUrl}
              onChange={(e) => setListingCoverImageUrl(e.target.value)}
              placeholder="https://… or /uploads/…"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Gallery</label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPickGallery}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploadBusy || isSubmitting}
                onClick={() => galleryInputRef.current?.click()}
              >
                {uploadBusy ? "Uploading…" : "Upload gallery images"}
              </Button>
            </div>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Gallery URLs (one per line)</label>
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={listingGalleryUrlsRaw}
              onChange={(e) => setListingGalleryUrlsRaw(e.target.value)}
              placeholder={"https://…\n/uploads/units/…"}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Amenities</h2>
        <p className="mt-1 text-sm text-muted-foreground">Stored as a list on the unit; shown as tags on public listings.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {LISTING_AMENITY_PRESETS.map((p) => {
            const on = amenities.some((a) => a.toLowerCase() === p.toLowerCase());
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePreset(p)}
                disabled={isSubmitting}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={amenityDraft}
            onChange={(e) => setAmenityDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAmenityDraft();
              }
            }}
            placeholder="Add custom amenity"
            disabled={isSubmitting}
          />
          <Button type="button" variant="outline" onClick={addAmenityDraft} disabled={isSubmitting}>
            Add
          </Button>
        </div>

        {amenities.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {amenities.map((a) => (
              <li
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {a}
                <button
                  type="button"
                  className="ml-1 rounded-full px-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setAmenities((prev) => prev.filter((x) => x !== a))}
                  disabled={isSubmitting}
                  aria-label={`Remove ${a}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No amenities yet — optional, but improves listing cards.</p>
        )}
      </div>

      {message ? (
        <p className={msgOk ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>{message}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save listing"}
      </Button>
    </form>
  );
}

function splitGallery(raw: string): string[] {
  return raw
    .split(/[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
