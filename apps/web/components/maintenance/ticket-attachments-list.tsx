import type { TicketAttachmentRow } from "@/server/queries/maintenance";

type Props = { attachments: TicketAttachmentRow[] };

export function TicketAttachmentsList({ attachments }: Props) {
  if (attachments.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold">Attachments</h3>
        <p className="mt-2 text-sm text-muted-foreground">No files linked yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold">Attachments</h3>
      <ul className="mt-3 divide-y divide-border text-sm">
        {attachments.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <a href={a.fileUrl} className="font-medium text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {a.fileType || "File"}
            </a>
            <span className="text-xs text-muted-foreground">
              {a.uploadedByName} · {new Date(a.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
