import { prisma } from "@/lib/prisma";
import { getActionRequired } from "@/server/action-required/engine";
import { isTerminalMaintenanceStatus } from "@/lib/maintenance/statuses";
import { rowFromTicket, type StaffWorkSummary, type TicketListRow } from "@/server/queries/maintenance";

/**
 * Staff home summary — driven by the centralized action-required engine, then hydrated
 * with the same ticket row shape as list views.
 *
 * Uses **actionRequired** only (staff **tracking** is always empty). Same rows drive **byPriority** if needed later.
 */
export async function getStaffWorkSummary(userId: string): Promise<StaffWorkSummary> {
  const { actionRequired } = await getActionRequired({ scope: "staff", userId, limit: 80 });
  const maintenanceIds = actionRequired.filter((i) => i.domain === "maintenance").map((i) => i.recordId);

  if (maintenanceIds.length === 0) {
    return { openTickets: [], scheduledSoon: [], highPriorityOpen: [] };
  }

  const rows = await prisma.ticket.findMany({
    where: { id: { in: maintenanceIds } },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } }
    }
  });

  const openTickets: TicketListRow[] = rows.filter((t) => !isTerminalMaintenanceStatus(t.status)).map(rowFromTicket).slice(0, 20);

  const now = Date.now();
  const horizon = now + 14 * 24 * 60 * 60 * 1000;
  const scheduledSoon = openTickets
    .filter((t) => {
      if (!t.appointmentAt) {
        return false;
      }
      const ts = new Date(t.appointmentAt).getTime();
      return ts >= now && ts <= horizon;
    })
    .sort((a, b) => (a.appointmentAt ?? "").localeCompare(b.appointmentAt ?? ""));

  const highPriorityOpen = openTickets
    .filter((t) => t.priority.toLowerCase() === "high" || t.priority.toLowerCase() === "urgent")
    .slice(0, 8);

  return { openTickets, scheduledSoon, highPriorityOpen };
}
