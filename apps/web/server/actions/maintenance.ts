"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { maintenanceShouldClearAppointment } from "@/lib/scheduling/appointment-fields";
import { findTransitionEdge, isTerminalMaintenanceStatus } from "@/lib/maintenance/statuses";
import { staffHasPortalPermission } from "@/lib/rbac/staff-permissions";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";
import { resolveActiveLeaseForAdminById } from "@/server/queries/leases-admin";
import { userMayReceiveMaintenanceAssignments } from "@/server/queries/staff-access";
import { canTenantReadTicket, getTicketById } from "@/server/queries/maintenance";

async function uniqueTicketNo(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const candidate = `MT-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const clash = await prisma.ticket.findUnique({ where: { ticketNo: candidate }, select: { id: true } });
    if (!clash) {
      return candidate;
    }
  }
  throw new Error("Could not allocate ticket number");
}

function isAdminLike(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

function isStaffOnly(roles: readonly string[]): boolean {
  return roles.includes("staff") && !isAdminLike(roles);
}

function staffDeniedMaintenance(
  roles: readonly string[],
  staffPermissions: readonly string[]
): boolean {
  return isStaffOnly(roles) && !staffHasPortalPermission(roles, staffPermissions, "staff.maintenance");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Tenant self-serve: uses the caller’s active lease as context. */
function ticketHasQuoteForWorkflow(t: {
  quoteDescription: string | null;
  quotedAmount: Prisma.Decimal | null;
}): boolean {
  if (t.quoteDescription?.trim()) {
    return true;
  }
  if (t.quotedAmount != null && Number(t.quotedAmount) > 0) {
    return true;
  }
  return false;
}

function revalidateTicketPaths(ticketId: string) {
  revalidatePath("/tenant/maintenance");
  revalidatePath(`/tenant/maintenance/${ticketId}`);
  revalidatePath("/tenant/dashboard");
  revalidatePath("/admin/maintenance");
  revalidatePath(`/admin/maintenance/${ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/staff/tickets/${ticketId}`);
}

export async function createMaintenanceTicket(input: {
  title: string;
  description?: string;
  category: string;
  priority?: string;
  permissionToEnter?: boolean;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const lease = await getOperationalLeaseForTenant(guard.userId);
  if (!lease) {
    return { ok: false, error: "no_active_lease" };
  }

  const title = input.title?.trim();
  const category = input.category?.trim();
  if (!title || !category) {
    return { ok: false, error: "missing_fields" };
  }

  const priority = input.priority?.trim() || "medium";
  const ticketNo = await uniqueTicketNo();

  await prisma.ticket.create({
    data: {
      ticketNo,
      propertyId: lease.building.id,
      unitId: lease.unit.id,
      leaseId: lease.leaseId,
      openedByUserId: guard.userId,
      category,
      priority,
      title,
      description: input.description?.trim() || null,
      status: "Pending Review",
      permissionToEnter: Boolean(input.permissionToEnter)
    }
  });

  revalidatePath("/tenant/maintenance");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/admin/maintenance");
  return { ok: true };
}

/** Admin creates a ticket for a chosen **calendar-active** lease (audit: opened by admin user). */
export async function createAdminMaintenanceTicket(input: {
  leaseId: string;
  title: string;
  description?: string;
  category: string;
  priority?: string;
  permissionToEnter?: boolean;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const resolved = await resolveActiveLeaseForAdminById(input.leaseId.trim());
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const title = input.title?.trim();
  const category = input.category?.trim();
  if (!title || !category) {
    return { ok: false, error: "missing_fields" };
  }

  const priority = input.priority?.trim() || "medium";
  const ticketNo = await uniqueTicketNo();

  await prisma.ticket.create({
    data: {
      ticketNo,
      propertyId: resolved.propertyId,
      unitId: resolved.unitId,
      leaseId: resolved.leaseId,
      openedByUserId: guard.userId,
      category,
      priority,
      title,
      description: input.description?.trim() || null,
      status: "Pending Review",
      permissionToEnter: Boolean(input.permissionToEnter)
    }
  });

  revalidatePath("/tenant/maintenance");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

/** Assignee submits quote and moves ticket to **Awaiting Admin Review**. */
export async function submitMaintenanceQuote(input: {
  ticketId: string;
  quoteDescription: string;
  quotedAmount?: string;
  approvalNeededSuggestion?: boolean;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["staff", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  if (staffDeniedMaintenance(guard.roles, guard.staffPermissions)) {
    return { ok: false, error: "forbidden" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  if (isStaffOnly(guard.roles) && ticket.assignedToUserId !== guard.userId) {
    return { ok: false, error: "not_assignee" };
  }

  if (ticket.status !== "Assigned to Staff") {
    return { ok: false, error: "wrong_status_for_quote" };
  }

  const desc = input.quoteDescription?.trim();
  if (!desc) {
    return { ok: false, error: "missing_quote_description" };
  }

  let quoted: Prisma.Decimal | null = null;
  if (input.quotedAmount?.trim()) {
    const n = Number.parseFloat(input.quotedAmount.trim());
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "invalid_quote_amount" };
    }
    quoted = new Prisma.Decimal(n);
  }

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: {
      quoteDescription: desc,
      quotedAmount: quoted,
      approvalNeeded: Boolean(input.approvalNeededSuggestion),
      status: "Awaiting Admin Review"
    }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export async function setMaintenanceApprovalNeeded(input: {
  ticketId: string;
  approvalNeeded: boolean;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  if (isTerminalMaintenanceStatus(ticket.status)) {
    return { ok: false, error: "already_terminal" };
  }

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: { approvalNeeded: input.approvalNeeded }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export async function setMaintenanceInternalCost(input: {
  ticketId: string;
  internalCost: string;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const n = Number.parseFloat(input.internalCost.trim());
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: { internalCost: new Prisma.Decimal(n) }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export async function addMaintenanceAttachment(input: {
  ticketId: string;
  fileUrl: string;
  fileType?: string;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["tenant", "staff", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const url = input.fileUrl?.trim();
  if (!url) {
    return { ok: false, error: "missing_url" };
  }

  const ticket = await getTicketById(input.ticketId);
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  if (isStaffOnly(guard.roles)) {
    if (staffDeniedMaintenance(guard.roles, guard.staffPermissions)) {
      return { ok: false, error: "forbidden" };
    }
    if (ticket.assignedToUserId !== guard.userId) {
      return { ok: false, error: "not_assignee" };
    }
  } else if (guard.roles.includes("tenant") && !isAdminLike(guard.roles)) {
    const okRead = await canTenantReadTicket(guard.userId, input.ticketId);
    if (!okRead) {
      return { ok: false, error: "forbidden" };
    }
  }

  await prisma.maintenanceAttachment.create({
    data: {
      maintenanceTicketId: input.ticketId,
      fileUrl: url,
      fileType: input.fileType?.trim() || null,
      uploadedByUserId: guard.userId
    }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export async function assignMaintenanceTicketStaff(input: {
  ticketId: string;
  staffUserId: string;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const staff = await prisma.user.findFirst({
    where: {
      id: input.staffUserId,
      isActive: true,
      userRoles: { some: { role: { code: "staff" } } }
    },
    select: { id: true }
  });
  if (!staff) {
    return { ok: false, error: "invalid_staff" };
  }
  const mayAssign = await userMayReceiveMaintenanceAssignments(input.staffUserId);
  if (!mayAssign) {
    return { ok: false, error: "staff_missing_maintenance_permission" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  const nextStatus =
    ticket.status === "Pending Review" ? "Assigned to Staff" : ticket.status;

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: {
      assignedToUserId: input.staffUserId,
      status: nextStatus
    }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export async function updateMaintenanceTicketStatus(input: {
  ticketId: string;
  toStatus: string;
  /** Required when moving to `Scheduled` (ISO datetime string). */
  appointmentAt?: string;
}): Promise<ActionResult> {
  const guard = await guardActionRoles(["tenant", "staff", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const ticket = await getTicketById(input.ticketId);
  if (!ticket) {
    return { ok: false, error: "not_found" };
  }

  if (isStaffOnly(guard.roles) && staffDeniedMaintenance(guard.roles, guard.staffPermissions)) {
    return { ok: false, error: "forbidden" };
  }

  const fromStatus = ticket.status;
  const toStatus = input.toStatus;

  if (fromStatus === toStatus) {
    return { ok: true };
  }

  if (isTerminalMaintenanceStatus(fromStatus)) {
    return { ok: false, error: "already_terminal" };
  }

  const edge = findTransitionEdge(fromStatus, toStatus, guard.roles);
  if (!edge) {
    return { ok: false, error: "invalid_transition" };
  }

  if (isStaffOnly(guard.roles)) {
    if (ticket.assignedToUserId !== guard.userId) {
      return { ok: false, error: "not_assignee" };
    }
  }

  if (guard.roles.includes("tenant") && !isAdminLike(guard.roles)) {
    const canRead = await canTenantReadTicket(guard.userId, input.ticketId);
    if (!canRead) {
      return { ok: false, error: "forbidden" };
    }
    if (toStatus === "Cancelled" && ticket.openedByUserId !== guard.userId) {
      return { ok: false, error: "tenant_cancel_own_only" };
    }
  }

  if (fromStatus === "Assigned to Staff" && toStatus === "Awaiting Admin Review") {
    if (!ticketHasQuoteForWorkflow(ticket) && !isAdminLike(guard.roles)) {
      return { ok: false, error: "quote_required" };
    }
  }

  if (fromStatus === "Awaiting Admin Review" && toStatus === "Awaiting Tenant Approval") {
    if (!ticket.approvalNeeded) {
      return { ok: false, error: "approval_not_flagged" };
    }
  }

  let appointmentAt: Date | undefined;
  if (toStatus === "Scheduled") {
    const raw = input.appointmentAt?.trim();
    if (!raw) {
      return { ok: false, error: "appointment_required" };
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "invalid_appointment" };
    }
    appointmentAt = d;
  }

  const data: {
    status: string;
    closedAt?: Date;
    appointmentAt?: Date | null;
  } = { status: toStatus };

  if (isTerminalMaintenanceStatus(toStatus)) {
    data.closedAt = new Date();
    data.appointmentAt = null;
  }
  if (toStatus === "Scheduled" && appointmentAt) {
    data.appointmentAt = appointmentAt;
  } else if (maintenanceShouldClearAppointment(fromStatus, toStatus)) {
    data.appointmentAt = null;
  }

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data
  });

  auditLog({
    type: "workflow",
    action: "maintenance_status",
    actorUserId: guard.userId,
    recordType: "ticket",
    recordId: input.ticketId,
    meta: { fromStatus, toStatus, appointmentAt: data.appointmentAt?.toISOString() ?? null }
  });

  revalidateTicketPaths(input.ticketId);
  return { ok: true };
}

export type TicketFromIssueResult = { ok: true; ticketId: string } | ActionResult;

/** Admin converts a move-in issue into a maintenance ticket (links issue → ticket). */
export async function createTicketFromCheckInIssue(input: {
  checkInIssueId: string;
  category?: string;
}): Promise<TicketFromIssueResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const issue = await prisma.leaseCheckInIssue.findUnique({
    where: { id: input.checkInIssueId.trim() },
    include: {
      checkIn: {
        include: {
          lease: {
            include: {
              unit: { include: { property: true } }
            }
          }
        }
      }
    }
  });

  if (!issue) {
    return { ok: false, error: "not_found" };
  }
  if (issue.convertedTicketId) {
    return { ok: false, error: "already_converted" };
  }

  const st = issue.checkIn.status.trim().toLowerCase();
  if (st === "approved" || st === "rejected" || st === "cancelled") {
    return { ok: false, error: "check_in_closed" };
  }

  const lease = issue.checkIn.lease;
  const ticketNo = await uniqueTicketNo();
  const category = input.category?.trim() || "Move-in / Check-in";
  const sev = issue.severity.trim().toLowerCase();
  const priority =
    sev === "safety" || sev === "high" ? "high" : sev === "low" || sev === "cosmetic" ? "low" : "medium";

  const descParts = [
    issue.details?.trim() || null,
    issue.areaLabel?.trim() ? `Area / location: ${issue.areaLabel.trim()}` : null,
    `Reported severity: ${issue.severity}`
  ].filter(Boolean);

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        ticketNo,
        propertyId: lease.unit.propertyId,
        unitId: lease.unitId,
        leaseId: lease.id,
        openedByUserId: guard.userId,
        category,
        priority,
        title: issue.summary.trim().slice(0, 200),
        description: descParts.length ? descParts.join("\n\n") : null,
        status: "Pending Review"
      }
    });
    await tx.leaseCheckInIssue.update({
      where: { id: issue.id },
      data: { convertedTicketId: t.id }
    });
    return t;
  });

  revalidateTicketPaths(ticket.id);
  revalidatePath("/admin/checkins");
  revalidatePath(`/admin/checkins/${issue.checkInId}`);
  revalidatePath("/owner/maintenance");
  return { ok: true, ticketId: ticket.id };
}
