import Link from "next/link";
import { cn } from "@/lib/utils";
import { requireStaffPortalPermission } from "@/server/auth/session";
import { listTicketsForStaff } from "@/server/queries/maintenance";

function statusClass(status: string): string {
  if (status === "Completed" || status === "Cancelled" || status === "Rejected") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-secondary text-secondary-foreground";
}

export default async function StaffTicketsPage() {
  const session = await requireStaffPortalPermission("staff.maintenance");
  const tickets = await listTicketsForStaff(session.user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tickets assigned to you.</p>
      </header>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/staff/tickets/${t.id}`}
                className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.ticketNo}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass(t.status))}>
                    {t.status}
                  </span>
                </div>
                <p className="mt-1 font-medium">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Opened by {t.openedByName} · {new Date(t.openedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
