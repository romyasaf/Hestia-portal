"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { addMaintenanceAttachment } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

type Props = { ticketId: string };

export function MaintenanceAttachmentForm({ ticketId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addMaintenanceAttachment({
        ticketId,
        fileUrl: url,
        fileType: fileType || undefined
      });
      if (!res.ok) {
        setMessage(
          res.error === "missing_url"
            ? "Enter a file URL (e.g. from company storage)."
            : res.error === "not_assignee"
              ? "Only the assigned staff member can add attachments here."
              : "Could not add attachment."
        );
        return;
      }
      setUrl("");
      setFileType("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Add attachment (URL)</h3>
      <input
        required
        type="url"
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <input
        type="text"
        placeholder="File type (optional, e.g. image/jpeg)"
        value={fileType}
        onChange={(e) => setFileType(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add attachment"}
      </Button>
    </form>
  );
}
