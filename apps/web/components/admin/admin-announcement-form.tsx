"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { upsertAnnouncement } from "@/server/actions/announcements";
import { Button } from "@/components/ui/button";

type PropOpt = { id: string; label: string };

type Props = {
  properties: PropOpt[];
  announcementId?: string;
  initial?: {
    title: string;
    body: string;
    audienceType: string;
    propertyId: string;
    isPublished: boolean;
    publishedAt: string;
  };
};

export function AdminAnnouncementForm({ properties, announcementId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [audienceType, setAudienceType] = useState(initial?.audienceType ?? "all");
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? properties[0]?.id ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt ? initial.publishedAt.slice(0, 16) : ""
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await upsertAnnouncement({
        id: announcementId,
        title,
        body,
        audienceType,
        propertyId: audienceType === "building" ? propertyId : null,
        isPublished,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          building_requires_property: "Pick a property for building-specific audience.",
          invalid_audience: "Invalid audience type."
        };
        setMessage(map[res.error] ?? "Could not save.");
        return;
      }
      router.push("/admin/announcements");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Body</label>
        <textarea
          required
          rows={8}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Audience</label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={audienceType}
          onChange={(e) => setAudienceType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="tenants">Tenants</option>
          <option value="staff">Staff</option>
          <option value="owners">Owners</option>
          <option value="building">Single building</option>
        </select>
      </div>
      {audienceType === "building" ? (
        <div>
          <label className="text-sm font-medium">Property</label>
          <select
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
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        Published
      </label>
      {isPublished ? (
        <div>
          <label className="text-sm font-medium">Publish at (optional, local)</label>
          <input
            type="datetime-local"
            className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </div>
      ) : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {announcementId ? "Save announcement" : "Create announcement"}
      </Button>
    </form>
  );
}
