import { isTerminalMaintenanceStatus } from "@/lib/maintenance/statuses";
import { prisma } from "@/lib/prisma";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";

export type TicketListRow = {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  openedAt: string;
  openedByName: string;
  assignedToName: string | null;
  appointmentAt: string | null;
};

export function rowFromTicket(t: {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  openedAt: Date;
  appointmentAt: Date | null;
  openedBy: { fullName: string };
  assignedTo: { fullName: string } | null;
}): TicketListRow {
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    openedAt: t.openedAt.toISOString(),
    openedByName: t.openedBy.fullName,
    assignedToName: t.assignedTo?.fullName ?? null,
    appointmentAt: t.appointmentAt?.toISOString() ?? null
  };
}

/**
 * Tickets for the tenant’s **current** active lease (`leaseId` must be that lease’s id),
 * plus legacy rows with `lease_id` null on the same unit opened by this user.
 */
export async function listTicketsForTenantLease(userId: string, leaseId: string, unitId: string) {
  const rows = await prisma.ticket.findMany({
    where: {
      OR: [
        { leaseId },
        {
          AND: [{ leaseId: null }, { unitId }, { openedByUserId: userId }]
        }
      ]
    },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } }
    }
  });
  return rows.map(rowFromTicket);
}

export async function listTicketsForAdmin() {
  const rows = await prisma.ticket.findMany({
    orderBy: { openedAt: "desc" },
    take: 100,
    include: {
      openedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } }
    }
  });
  return rows.map(rowFromTicket);
}

export async function listTicketsForStaff(userId: string) {
  const rows = await prisma.ticket.findMany({
    where: { assignedToUserId: userId },
    orderBy: { openedAt: "desc" },
    take: 100,
    include: {
      openedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } }
    }
  });
  return rows.map(rowFromTicket);
}

export type TicketAttachmentRow = {
  id: string;
  fileUrl: string;
  fileType: string | null;
  uploadedByName: string;
  createdAt: string;
};

export type TicketDetail = {
  id: string;
  ticketNo: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  openedByUserId: string;
  openedByName: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  openedAt: string;
  closedAt: string | null;
  quotedAmount: string | null;
  quoteDescription: string | null;
  internalCost: string | null;
  approvalNeeded: boolean;
  permissionToEnter: boolean;
  appointmentAt: string | null;
  attachments: TicketAttachmentRow[];
};

function decimalOrNull(v: { toString(): string } | null | undefined): string | null {
  if (v == null) {
    return null;
  }
  return v.toString();
}

export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      openedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      unit: { select: { id: true, unitNumber: true } },
      property: { select: { id: true, name: true, code: true } },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { fullName: true } } }
      }
    }
  });
}

export function toTicketDetail(t: NonNullable<Awaited<ReturnType<typeof getTicketById>>>): TicketDetail {
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    propertyId: t.propertyId,
    unitId: t.unitId,
    leaseId: t.leaseId,
    openedByUserId: t.openedByUserId,
    openedByName: t.openedBy.fullName,
    assignedToUserId: t.assignedToUserId,
    assignedToName: t.assignedTo?.fullName ?? null,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
    quotedAmount: decimalOrNull(t.quotedAmount),
    quoteDescription: t.quoteDescription,
    internalCost: decimalOrNull(t.internalCost),
    approvalNeeded: t.approvalNeeded,
    permissionToEnter: t.permissionToEnter,
    appointmentAt: t.appointmentAt?.toISOString() ?? null,
    attachments: t.attachments.map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      uploadedByName: a.uploadedBy.fullName,
      createdAt: a.createdAt.toISOString()
    }))
  };
}

/** Tenant may read tickets on their operational lease, legacy same-unit rows, or historical lease-scoped tickets. */
export async function canTenantReadTicket(userId: string, ticketId: string): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { leaseId: true, unitId: true, propertyId: true, openedByUserId: true }
  });
  if (!ticket) {
    return false;
  }
  const lease = await getOperationalLeaseForTenant(userId);
  if (lease) {
    if (ticket.leaseId === lease.leaseId) {
      return true;
    }
    const legacySameUnit =
      ticket.leaseId === null &&
      ticket.unitId === lease.unit.id &&
      ticket.propertyId === lease.building.id &&
      ticket.openedByUserId === userId;
    if (legacySameUnit) {
      return true;
    }
  }
  if (ticket.leaseId) {
    const mine = await prisma.lease.findFirst({
      where: { id: ticket.leaseId, tenantUserId: userId },
      select: { id: true }
    });
    if (mine) {
      return true;
    }
  }
  return false;
}

export type StaffWorkSummary = {
  openTickets: TicketListRow[];
  scheduledSoon: TicketListRow[];
  highPriorityOpen: TicketListRow[];
};

export async function listStaffUsersForAssignment() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: { code: "staff" }
        }
      },
      OR: [
        { staffPermissionGrants: { none: {} } },
        { staffPermissionGrants: { some: { permissionCode: "staff.maintenance" } } }
      ]
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" }
  });
}
