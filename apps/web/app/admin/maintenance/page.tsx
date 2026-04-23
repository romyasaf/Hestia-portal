import Link from "next/link";
import { AdminCreateMaintenanceTicketForm } from "@/components/admin/maintenance/admin-create-ticket-form";
import { listActiveLeasesForAdminSelect } from "@/server/queries/leases-admin";
import { listTicketsForAdmin } from "@/server/queries/maintenance";
import { cn } from "@/lib/utils";

function statusClass(status: string): string {
  if (status === "Completed" || status === "Cancelled" || status === "Rejected") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-secondary text-secondary-foreground";
}

export default async function AdminMaintenancePage() {
  const [tickets, leaseOptions] = await Promise.all([listTicketsForAdmin(), listActiveLeasesForAdminSelect()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, assign staff, and move tickets through PRD statuses.</p>
      </header>

      <AdminCreateMaintenanceTicketForm leases={leaseOptions} />

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Opened by</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/maintenance/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.ticketNo}
                    </Link>
                    <div className="text-muted-foreground">{t.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusClass(t.status))}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.openedByName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.assignedToName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.openedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
