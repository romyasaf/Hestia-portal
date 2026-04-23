import { requireSession } from "@/server/auth/session";
import { listAnnouncementsForTenantUser } from "@/server/queries/announcements";

export default async function TenantAnnouncementsPage() {
  const session = await requireSession();
  const items = await listAnnouncementsForTenantUser(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Updates from Hestia for your building or all tenants, based on your active lease.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements right now.</p>
      ) : (
        <ul className="space-y-6">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{a.title}</h2>
              {a.publishedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.publishedAt).toLocaleString()}
                </p>
              ) : null}
              <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
