import { requireSession } from "@/server/auth/session";
import { listOwnerTickets } from "@/server/queries/owner-portal";

export default async function OwnerMaintenancePage() {
  const session = await requireSession();
  const rows = await listOwnerTickets(session.user.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tickets on your buildings (read-only overview).</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  <span className="font-mono text-xs text-muted-foreground">{t.ticketNo}</span> · {t.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unit {t.unitNumber ?? "—"} · {t.priority} priority
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.status}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
