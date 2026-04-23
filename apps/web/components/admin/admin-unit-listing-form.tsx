"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { updateUnitListing } from "@/server/actions/admin-entities";
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
  };
};

export function AdminUnitListingForm({ unitId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState(initial.listingTitle);
  const [listingDescription, setListingDescription] = useState(initial.listingDescription);
  const [listingMonthlyPrice, setListingMonthlyPrice] = useState(initial.listingMonthlyPrice);
  const [listingCoverImageUrl, setListingCoverImageUrl] = useState(initial.listingCoverImageUrl);
  const [listingGalleryUrlsRaw, setListingGalleryUrlsRaw] = useState(initial.listingGalleryUrlsRaw);
  const [listingAmenitiesRaw, setListingAmenitiesRaw] = useState(initial.listingAmenitiesRaw);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await updateUnitListing({
        unitId,
        listingTitle,
        listingDescription,
        listingMonthlyPrice,
        listingCoverImageUrl,
        listingGalleryUrlsRaw,
        listingAmenitiesRaw
      });
      if (!res.ok) {
        setMessage(
          res.error === "cover_url_too_long"
            ? "Cover image URL is too long."
            : res.error === "invalid_unit"
              ? "Unit not found."
              : "Save failed."
        );
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Public listing copy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on the marketing site when the unit has no active lease and these fields are complete.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Listing title</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={listingTitle}
              onChange={(e) => setListingTitle(e.target.value)}
              placeholder="e.g. Bright 2BR in The Pearl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Public description</label>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
              value={listingDescription}
              onChange={(e) => setListingDescription(e.target.value)}
              placeholder="Full description for prospective tenants…"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Monthly price (public)</label>
            <input
              className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm tabular-nums"
              value={listingMonthlyPrice}
              onChange={(e) => setListingMonthlyPrice(e.target.value)}
              placeholder="QAR — can match operational rent"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              If empty, operational monthly rent can still satisfy the price rule when set on Overview.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Media</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste HTTPS image URLs (e.g. CDN or object storage). One gallery URL per line.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Cover image URL</label>
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={listingCoverImageUrl}
              onChange={(e) => setListingCoverImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Gallery image URLs</label>
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={listingGalleryUrlsRaw}
              onChange={(e) => setListingGalleryUrlsRaw(e.target.value)}
              placeholder={"https://…\nhttps://…"}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Amenities</h2>
        <p className="mt-1 text-sm text-muted-foreground">Comma or line-separated tags (e.g. balcony, parking, sea view).</p>
        <textarea
          className="mt-4 min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={listingAmenitiesRaw}
          onChange={(e) => setListingAmenitiesRaw(e.target.value)}
          placeholder={"Balcony\nParking\nPool"}
        />
      </div>

      {message ? (
        <p className={message === "Saved." ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save listing"}
      </Button>
    </form>
  );
}
