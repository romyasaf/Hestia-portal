import { prisma } from "@/lib/prisma";
import type { ActionPriorityBand } from "@/lib/action-required/priority";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import { getActionRequired, type ActionRequiredItem } from "@/server/action-required/engine";
import { getOperationalLeaseForTenant, type ActiveLeaseForTenant } from "@/server/queries/leases";
import { listTicketsForTenantLease, type TicketListRow } from "@/server/queries/maintenance";

export type TenantTicketRow = TicketListRow;

export type TenantRequestRow = {
  id: string;
  jobNo: string;
  requestKind: string | null;
  title: string;
  status: string;
  scope: string | null;
  createdAt: string;
};

export type TenantActionItemKind = "ticket" | "request" | "checkin_issue" | "checkout";

export type TenantActionItem = {
  id: string;
  kind: TenantActionItemKind;
  title: string;
  status: string;
  summary: string;
  href: string;
  sortAt: string;
  priority?: ActionPriorityBand;
};

function toTenantActionItem(i: ActionRequiredItem): TenantActionItem {
  const kind: TenantActionItemKind =
    i.domain === "maintenance"
      ? "ticket"
      : i.domain === "tenant_request"
        ? "request"
        : i.domain === "checkin_issue"
          ? "checkin_issue"
          : "checkout";
  return {
    id: i.id,
    kind,
    title: i.title,
    status: i.status,
    summary: i.summary,
    href: i.href,
    sortAt: i.sortAt,
    priority: i.priority
  };
}

/**
 * Dashboard payload scoped to the tenant user: active lease, tickets on that lease,
 * and jobs they raised for that unit or building.
 *
 * **actionItems** / **trackingItems** — from `getActionRequired({ scope: "tenant" })`:
 * **actionRequired** → tasks the tenant must do; **tracking** → open work with no tenant action.
 * Do not use **byPriority** for “all open items” — it omits **tracking**; **byType** is the full domain grouping.
 */
export async function getTenantDashboardData(userId: string): Promise<{
  lease: ActiveLeaseForTenant | null;
  tickets: TenantTicketRow[];
  requests: TenantRequestRow[];
  actionItems: TenantActionItem[];
  trackingItems: TenantActionItem[];
}> {
  const lease = await getOperationalLeaseForTenant(userId);

  if (!lease) {
    return { lease: null, tickets: [], requests: [], actionItems: [], trackingItems: [] };
  }

  const unitId = lease.unit.id;
  const propertyId = lease.building.id;

  const [ar, ticketRows, jobRows] = await Promise.all([
    getActionRequired({ scope: "tenant", userId, limit: 40 }),
    listTicketsForTenantLease(userId, lease.leaseId, unitId),
    prisma.job.findMany({
      where: {
        sourceType: TENANT_REQUEST_SOURCE_TYPE,
        requesterUserId: userId,
        propertyId,
        unitId,
        OR: [{ sourceId: null }, { sourceId: lease.leaseId }]
      },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  const tickets = ticketRows;

  const requests: TenantRequestRow[] = jobRows.map((j) => ({
    id: j.id,
    jobNo: j.jobNo,
    requestKind: j.requestKind,
    title: j.title,
    status: j.status.trim().toLowerCase(),
    scope: j.scope,
    createdAt: j.createdAt.toISOString()
  }));

  const actionItems = ar.actionRequired.map(toTenantActionItem); // must-act queue
  const trackingItems = ar.tracking.map(toTenantActionItem); // status visibility only

  return { lease, tickets, requests, actionItems, trackingItems };
}
