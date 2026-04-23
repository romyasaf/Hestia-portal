import { leaseStatusActiveWhere } from "@/lib/leases/status";
import { mergePriorityBands, priorityBandForAppointment, type ActionPriorityBand } from "@/lib/action-required/priority";
import { isTerminalCheckInStatus } from "@/lib/checkin/statuses";
import { isTerminalMaintenanceStatus, MAINTENANCE_STATUSES } from "@/lib/maintenance/statuses";
import {
  maintenanceStatusIsOpenTracking,
  maintenanceStatusNeedsTenantAction,
  tenantRequestStatusIsOpenTracking,
  tenantRequestStatusNeedsTenantAction
} from "@/lib/maintenance/tenant-dashboard-logic";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import { isTerminalTenantRequestStatus } from "@/lib/tenant-requests/statuses";
import { prisma } from "@/lib/prisma";
import { listTicketsForTenantLease } from "@/server/queries/maintenance";

export type ActionRequiredScope = "tenant" | "staff" | "admin";

export type ActionRequiredDomain = "maintenance" | "tenant_request" | "checkin_issue" | "checkout";

export type ActionRequiredItem = {
  domain: ActionRequiredDomain;
  /** Stable list key */
  id: string;
  recordId: string;
  title: string;
  status: string;
  summary: string;
  href: string;
  sortAt: string;
  priority: ActionPriorityBand;
  /** ISO timestamp when a visit / deadline exists (admin maintenance, requests, checkouts). */
  scheduleAt?: string | null;
};

/**
 * **actionRequired** rows only, partitioned by priority band.
 * Does **not** include **tracking** (tenant “open but no action” rows), even though those appear in **byType**.
 */
export type ActionRequiredByPriority = {
  urgent: ActionRequiredItem[];
  today: ActionRequiredItem[];
  upcoming: ActionRequiredItem[];
  none: ActionRequiredItem[];
};

/**
 * Full per-domain grouping: for **tenant** scope, each domain list is the union of actionable and tracking rows.
 * For **staff** / **admin**, **tracking** is always empty, so **byType** aligns with **actionRequired** only.
 */
export type ActionRequiredByType = {
  maintenance: ActionRequiredItem[];
  tenant_request: ActionRequiredItem[];
  checkin_issue: ActionRequiredItem[];
  checkout: ActionRequiredItem[];
};

export type ActionRequiredResult = {
  /**
   * Items where the **scope actor must act** (approve, respond, attend, triage, etc.).
   * Use for task queues, banners, and “what I need to do” UI — **not** for passive status visibility.
   */
  actionRequired: ActionRequiredItem[];
  /**
   * **Tenant scope only:** work that is still open but **does not require tenant action** (ops/staff is driving).
   * Always `[]` for **staff** and **admin** scopes.
   */
  tracking: ActionRequiredItem[];
  /**
   * Per-domain lists including **both** **actionRequired** and **tracking** where the engine emits both (tenant).
   * This is the **full** grouping by domain — **not** the same set as **byPriority**.
   */
  byType: ActionRequiredByType;
  /**
   * **actionRequired** only, grouped by priority band. **Never** includes **tracking**; do not use as a full inventory of open items.
   */
  byPriority: ActionRequiredByPriority;
};

const ADMIN_NON_TERMINAL = MAINTENANCE_STATUSES.filter((s) => !isTerminalMaintenanceStatus(s));

function utcTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Appends one row to the structure returned as **byType** (actionable and tenant-tracking rows both use this). */
function pushItem(
  groupedByDomain: ActionRequiredByType,
  domain: ActionRequiredDomain,
  item: Omit<ActionRequiredItem, "domain" | "id"> & { recordId: string }
): ActionRequiredItem {
  const prefix =
    domain === "maintenance"
      ? "mt"
      : domain === "tenant_request"
        ? "rq"
        : domain === "checkin_issue"
          ? "ci"
          : "co";
  const full: ActionRequiredItem = {
    domain,
    id: `${prefix}-${item.recordId}`,
    ...item
  };
  groupedByDomain[
    domain === "maintenance"
      ? "maintenance"
      : domain === "tenant_request"
        ? "tenant_request"
        : domain === "checkin_issue"
          ? "checkin_issue"
          : "checkout"
  ].push(full);
  return full;
}

/** Builds **byPriority** from the actionable list only; callers must not pass **tracking** items here. */
function partitionByPriority(items: ActionRequiredItem[]): ActionRequiredByPriority {
  const urgent: ActionRequiredItem[] = [];
  const today: ActionRequiredItem[] = [];
  const upcoming: ActionRequiredItem[] = [];
  const none: ActionRequiredItem[] = [];
  for (const i of items) {
    if (i.priority === "urgent") {
      urgent.push(i);
    } else if (i.priority === "today") {
      today.push(i);
    } else if (i.priority === "upcoming") {
      upcoming.push(i);
    } else {
      none.push(i);
    }
  }
  const sortKey = (a: ActionRequiredItem, b: ActionRequiredItem) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0);
  urgent.sort(sortKey);
  today.sort(sortKey);
  upcoming.sort(sortKey);
  none.sort(sortKey);
  return { urgent, today, upcoming, none };
}

function tenantTicketSummary(status: string, forAction: boolean): string {
  if (forAction) {
    switch (status) {
      case "Awaiting Tenant Approval":
        return "Your approval is needed to continue.";
      case "Awaiting Scheduling":
        return "Pick a time with the office or staff to schedule the visit.";
      default:
        return "Your input is needed.";
    }
  }
  switch (status) {
    case "Pending Review":
      return "Waiting for the office to review or assign staff.";
    case "Assigned to Staff":
      return "Staff is handling this ticket.";
    case "Awaiting Admin Review":
      return "Waiting for the office after a staff update.";
    case "Scheduled":
      return "Appointment is set — staff will attend.";
    case "In Progress":
      return "Work is underway on-site.";
    default:
      return "Open ticket — the team is progressing this.";
  }
}

function adminTicketSummary(status: string): string {
  switch (status) {
    case "Pending Review":
      return "Review the ticket, assign staff, or reject.";
    case "Assigned to Staff":
      return "Work is with staff — monitor or reassign.";
    case "Awaiting Admin Review":
      return "Staff sent this back — approve next step or re-route.";
    case "Awaiting Tenant Approval":
      return "Waiting on tenant approval — follow up if stalled.";
    case "Approved":
      return "Approved — advance scheduling or assign staff.";
    case "Awaiting Scheduling":
      return "Coordinate appointment time with tenant or staff.";
    case "Scheduled":
      return "Appointment set — confirm staff attendance.";
    case "In Progress":
      return "Work in progress — confirm completion or issues.";
    default:
      return "This ticket may need operations follow-up.";
  }
}

function staffTicketSummary(status: string): string {
  switch (status) {
    case "Assigned to Staff":
      return "You are assigned — review scope and update the ticket.";
    case "Scheduled":
      return "Scheduled visit — confirm attendance.";
    case "In Progress":
      return "Complete on-site work and update status.";
    default:
      return "Follow up on this assigned ticket.";
  }
}

function adminJobSummary(status: string): string {
  const s = status.toLowerCase();
  if (s === "submitted") {
    return "Tenant request — open in Requests to review.";
  }
  if (s === "under_review") {
    return "Tenant request is under review — update status or complete.";
  }
  if (s === "approved") {
    return "Tenant request approved — complete or follow up.";
  }
  return "Tenant request still in progress.";
}

function checkoutAdminSummary(status: string): string {
  const s = status.toLowerCase();
  if (s === "requested") {
    return "Checkout requested — schedule inspection.";
  }
  if (s === "scheduled") {
    return "Inspection scheduled — ensure staff coverage.";
  }
  return "Checkout needs operations follow-up.";
}

function issueAdminSummary(severity: string): string {
  return `Check-in issue (${severity}) — triage or convert to maintenance.`;
}

/**
 * Centralized “who must act” engine for dashboards. Scope selects the actor lens; `userId` scopes tenant/staff rows.
 *
 * Contract: **actionRequired** = must-act; **tracking** = tenant-only open-but-passive; **byType** = full domain grouping
 * (**actionRequired ∪ tracking** for tenant); **byPriority** = **actionRequired** only, by band.
 */
export async function getActionRequired(input: {
  scope: ActionRequiredScope;
  userId: string;
  limit?: number;
}): Promise<ActionRequiredResult> {
  const limit = input.limit ?? 24;
  /** Mutable buckets for **ActionRequiredResult.byType** — both actionable and tenant-tracking rows land here. */
  const itemsGroupedByDomain: ActionRequiredByType = {
    maintenance: [],
    tenant_request: [],
    checkin_issue: [],
    checkout: []
  };
  const actionRequired: ActionRequiredItem[] = [];
  const tracking: ActionRequiredItem[] = [];

  if (input.scope === "tenant") {
    const lease = await prisma.lease.findFirst({
      where: {
        tenantUserId: input.userId,
        status: leaseStatusActiveWhere(),
        startDate: { lte: utcTodayDateOnly() },
        endDate: { gte: utcTodayDateOnly() },
        onboardingCompletedAt: { not: null }
      },
      orderBy: { startDate: "desc" },
      select: { id: true, unitId: true, unit: { select: { id: true } } }
    });

    if (!lease) {
      return {
        actionRequired: [],
        tracking: [],
        byType: itemsGroupedByDomain,
        byPriority: { urgent: [], today: [], upcoming: [], none: [] }
      };
    }

    const propertyId = await prisma.unit.findUnique({
      where: { id: lease.unitId },
      select: { propertyId: true }
    });

    const pid = propertyId?.propertyId;
    if (!pid) {
      return {
        actionRequired: [],
        tracking: [],
        byType: itemsGroupedByDomain,
        byPriority: { urgent: [], today: [], upcoming: [], none: [] }
      };
    }

    const ticketRows = await listTicketsForTenantLease(input.userId, lease.id, lease.unit.id);
    const jobRows = await prisma.job.findMany({
      where: {
        sourceType: TENANT_REQUEST_SOURCE_TYPE,
        requesterUserId: input.userId,
        propertyId: pid,
        unitId: lease.unit.id,
        OR: [{ sourceId: null }, { sourceId: lease.id }]
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        jobNo: true,
        title: true,
        status: true,
        scope: true,
        createdAt: true,
        scheduledAt: true
      }
    });

    for (const t of ticketRows) {
      if (isTerminalMaintenanceStatus(t.status)) {
        continue;
      }
      const ap = t.appointmentAt ? new Date(t.appointmentAt) : null;
      const pr = mergePriorityBands(
        priorityBandForAppointment(ap),
        t.priority.toLowerCase() === "urgent" || t.priority.toLowerCase() === "high"
      );
      const base = {
        recordId: t.id,
        title: t.title,
        status: t.status,
        href: `/tenant/maintenance/${t.id}`,
        sortAt: t.openedAt,
        priority: pr
      };
      if (maintenanceStatusNeedsTenantAction(t.status)) {
        const item = pushItem(itemsGroupedByDomain, "maintenance", {
          ...base,
          summary: tenantTicketSummary(t.status, true)
        });
        actionRequired.push(item);
      } else if (maintenanceStatusIsOpenTracking(t.status)) {
        const item = pushItem(itemsGroupedByDomain, "maintenance", {
          ...base,
          summary: tenantTicketSummary(t.status, false)
        });
        tracking.push(item);
      }
    }

    for (const j of jobRows) {
      const st = j.status.trim().toLowerCase();
      if (isTerminalTenantRequestStatus(st)) {
        continue;
      }
      const pr = mergePriorityBands(priorityBandForAppointment(j.scheduledAt), false);
      const base = {
        recordId: j.id,
        title: j.title,
        status: st,
        href: `/tenant/requests/${j.id}`,
        sortAt: j.createdAt.toISOString(),
        priority: pr
      };
      if (tenantRequestStatusNeedsTenantAction(st)) {
        const item = pushItem(itemsGroupedByDomain, "tenant_request", {
          ...base,
          summary: "Your response is needed on this request."
        });
        actionRequired.push(item);
      } else if (tenantRequestStatusIsOpenTracking(st)) {
        const item = pushItem(itemsGroupedByDomain, "tenant_request", {
          ...base,
          summary: "Open request — the office will follow up."
        });
        tracking.push(item);
      }
    }
  }

  if (input.scope === "admin") {
    const per = Math.max(4, Math.ceil(limit / 4));
    const [ticketRows, jobRows, issueRows, checkoutRows] = await Promise.all([
      prisma.ticket.findMany({
        where: { status: { in: [...ADMIN_NON_TERMINAL] } },
        orderBy: { openedAt: "asc" },
        take: per,
        select: {
          id: true,
          title: true,
          status: true,
          openedAt: true,
          appointmentAt: true,
          priority: true
        }
      }),
      prisma.job.findMany({
        where: {
          sourceType: TENANT_REQUEST_SOURCE_TYPE,
          NOT: {
            OR: [
              { status: { equals: "completed", mode: "insensitive" } },
              { status: { equals: "cancelled", mode: "insensitive" } },
              { status: { equals: "rejected", mode: "insensitive" } }
            ]
          }
        },
        orderBy: { createdAt: "asc" },
        take: per,
        select: { id: true, title: true, status: true, createdAt: true, scheduledAt: true }
      }),
      prisma.leaseCheckInIssue.findMany({
        where: { convertedTicketId: null },
        orderBy: { createdAt: "asc" },
        take: per,
        include: {
          checkIn: { select: { id: true, status: true } }
        }
      }),
      prisma.leaseCheckOut.findMany({
        where: {
          AND: [
            {
              NOT: {
                OR: [
                  { status: { equals: "completed", mode: "insensitive" } },
                  { status: { equals: "cancelled", mode: "insensitive" } }
                ]
              }
            },
            {
              OR: [
                { status: { equals: "requested", mode: "insensitive" } },
                { status: { equals: "scheduled", mode: "insensitive" } },
                { status: { equals: "inspected", mode: "insensitive" } }
              ]
            }
          ]
        },
        orderBy: { createdAt: "asc" },
        take: per,
        select: {
          id: true,
          status: true,
          createdAt: true,
          scheduledAt: true,
          lease: { select: { id: true, tenant: { select: { fullName: true } } } }
        }
      }),
    ]);

    for (const t of ticketRows) {
      const pr = mergePriorityBands(
        priorityBandForAppointment(t.appointmentAt),
        t.priority.toLowerCase() === "urgent" || t.priority.toLowerCase() === "high"
      );
      const item = pushItem(itemsGroupedByDomain, "maintenance", {
        recordId: t.id,
        title: t.title,
        status: t.status,
        summary: adminTicketSummary(t.status),
        href: `/admin/maintenance/${t.id}`,
        sortAt: t.openedAt.toISOString(),
        priority: pr,
        scheduleAt: t.appointmentAt ? t.appointmentAt.toISOString() : null
      });
      actionRequired.push(item);
    }

    for (const j of jobRows) {
      const pr = mergePriorityBands(priorityBandForAppointment(j.scheduledAt), false);
      const item = pushItem(itemsGroupedByDomain, "tenant_request", {
        recordId: j.id,
        title: j.title,
        status: j.status,
        summary: adminJobSummary(j.status),
        href: `/admin/requests/${j.id}`,
        sortAt: j.createdAt.toISOString(),
        priority: pr,
        scheduleAt: j.scheduledAt ? j.scheduledAt.toISOString() : null
      });
      actionRequired.push(item);
    }

    for (const issue of issueRows) {
      const st = issue.checkIn.status.trim().toLowerCase();
      if (isTerminalCheckInStatus(st)) {
        continue;
      }
      const pr = mergePriorityBands(
        "none",
        issue.severity.toLowerCase() === "high" || issue.severity.toLowerCase() === "safety"
      );
      const item = pushItem(itemsGroupedByDomain, "checkin_issue", {
        recordId: issue.id,
        title: issue.summary,
        status: st,
        summary: issueAdminSummary(issue.severity),
        href: `/admin/checkins/${issue.checkIn.id}`,
        sortAt: issue.createdAt.toISOString(),
        priority: pr,
        scheduleAt: null
      });
      actionRequired.push(item);
    }

    for (const c of checkoutRows) {
      const pr = mergePriorityBands(priorityBandForAppointment(c.scheduledAt), false);
      const label = `Checkout · ${c.lease.tenant.fullName}`;
      const item = pushItem(itemsGroupedByDomain, "checkout", {
        recordId: c.id,
        title: label,
        status: c.status,
        summary: checkoutAdminSummary(c.status),
        href: `/admin/checkouts/${c.id}`,
        sortAt: c.createdAt.toISOString(),
        priority: pr,
        scheduleAt: c.scheduledAt ? c.scheduledAt.toISOString() : null
      });
      actionRequired.push(item);
    }
  }

  if (input.scope === "staff") {
    const rows = await prisma.ticket.findMany({
      where: {
        assignedToUserId: input.userId,
        NOT: {
          status: { in: ["Completed", "Cancelled", "Rejected"] }
        }
      },
      orderBy: { openedAt: "desc" },
      take: limit,
      select: {
        id: true,
        ticketNo: true,
        title: true,
        status: true,
        priority: true,
        openedAt: true,
        appointmentAt: true
      }
    });

    for (const t of rows) {
      const pr = mergePriorityBands(
        priorityBandForAppointment(t.appointmentAt),
        t.priority.toLowerCase() === "urgent" || t.priority.toLowerCase() === "high"
      );
      const item = pushItem(itemsGroupedByDomain, "maintenance", {
        recordId: t.id,
        title: `${t.ticketNo} · ${t.title}`,
        status: t.status,
        summary: staffTicketSummary(t.status),
        href: `/staff/tickets/${t.id}`,
        sortAt: t.openedAt.toISOString(),
        priority: pr
      });
      actionRequired.push(item);
    }
  }

  /**
   * Sort the actionable queue only (**tracking** is a separate list and is never merged in here).
   * **byPriority** below is derived exclusively from this sorted **actionRequired** array.
   */
  const rank: Record<ActionPriorityBand, number> = { urgent: 0, today: 1, upcoming: 2, none: 3 };
  actionRequired.sort((a, b) => {
    const d = rank[a.priority] - rank[b.priority];
    if (d !== 0) {
      return d;
    }
    return a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0;
  });

  // Actionable-only bands — **byType** still holds the full domain union (**actionRequired** + **tracking** on tenant).
  const byPriority = partitionByPriority(actionRequired);

  return { actionRequired, tracking, byType: itemsGroupedByDomain, byPriority };
}
