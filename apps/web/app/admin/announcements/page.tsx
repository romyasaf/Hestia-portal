import Link from "next/link";
import { listAnnouncementsForAdmin } from "@/server/queries/announcements";

export default async function AdminAnnouncementsPage() {
  const rows = await listAnnouncementsForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publish notices to tenants, staff, or all.</p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New announcement
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.audienceType} · {r.isPublished ? "Published" : "Draft"}
                  {r.publishedAt ? ` · ${r.publishedAt}` : ""}
                </p>
              </div>
              <Link href={`/admin/announcements/${r.id}`} className="text-primary hover:underline">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
