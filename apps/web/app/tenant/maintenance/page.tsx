import Link from "next/link";
import { CreateMaintenanceTicketForm } from "@/components/maintenance/create-ticket-form";
import { listTicketsForTenantLease } from "@/server/queries/maintenance";
import { requireTenantOperationalLease } from "@/server/tenant-portal/require-operational";
import { cn } from "@/lib/utils";

function statusClass(status: string): string {
  if (status === "Completed" || status === "Cancelled" || status === "Rejected") {
    return "bg-muted text-muted-foreground";
  }
  if (status === "In Progress" || status === "Scheduled") {
    return "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
  }
  return "bg-secondary text-secondary-foreground";
}

export default async function TenantMaintenancePage() {
  const { userId, lease } = await requireTenantOperationalLease();
  const tickets = await listTicketsForTenantLease(userId, lease.leaseId, lease.unit.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tickets for your current lease. New tickets start in <strong>Pending Review</strong>.
        </p>
      </header>

      <CreateMaintenanceTicketForm />

      <section>
        <h2 className="text-lg font-semibold">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tenant/maintenance/${t.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.ticketNo}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass(t.status))}>
                      {t.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.priority}</span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">{t.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.category} · Opened {new Date(t.openedAt).toLocaleString()}
                    {t.assignedToName ? ` · Assigned: ${t.assignedToName}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
