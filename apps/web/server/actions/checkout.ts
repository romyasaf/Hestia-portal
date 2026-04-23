"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { findCheckoutTransition, isTerminalCheckoutStatus } from "@/lib/checkout/statuses";
import { checkoutShouldClearScheduledAt } from "@/lib/scheduling/appointment-fields";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";
import {
  canTenantAccessCheckout,
  getCheckoutById,
  getOpenCheckoutForLease
} from "@/server/queries/checkout";

export type CheckoutActionResult = { ok: true } | { ok: false; error: string };

function isAdminLike(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export async function requestLeaseCheckout(input: {
  tenantNotes?: string;
  preferredMoveOutDate?: string;
}): Promise<CheckoutActionResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const lease = await getOperationalLeaseForTenant(guard.userId);
  if (!lease) {
    return { ok: false, error: "no_active_lease" };
  }

  const open = await getOpenCheckoutForLease(lease.leaseId);
  if (open) {
    return { ok: false, error: "open_checkout_exists" };
  }

  let preferred: Date | null = null;
  if (input.preferredMoveOutDate?.trim()) {
    const d = new Date(`${input.preferredMoveOutDate.trim()}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "invalid_date" };
    }
    preferred = d;
  }

  await prisma.leaseCheckOut.create({
    data: {
      leaseId: lease.leaseId,
      tenantUserId: guard.userId,
      status: "requested",
      tenantNotes: input.tenantNotes?.trim() || null,
      preferredMoveOutDate: preferred
    }
  });

  revalidatePath("/tenant/checkout");
  revalidatePath("/admin/checkouts");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function scheduleLeaseCheckout(input: {
  checkoutId: string;
  scheduledAt: string;
}): Promise<CheckoutActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const from = row.status.trim().toLowerCase();
  if (from !== "requested") {
    return { ok: false, error: "not_schedulable" };
  }

  const at = new Date(input.scheduledAt);
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "invalid_datetime" };
  }

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: {
      status: "scheduled",
      scheduledAt: at
    }
  });

  auditLog({
    type: "scheduling",
    action: "checkout_schedule",
    actorUserId: guard.userId,
    recordType: "lease_checkout",
    recordId: row.id,
    meta: { scheduledAt: at.toISOString() }
  });

  revalidatePath("/tenant/checkout");
  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function updateLeaseCheckoutStatus(input: {
  checkoutId: string;
  nextStatus: string;
  adminNotes?: string | null;
}): Promise<CheckoutActionResult> {
  const guard = await guardActionRoles(["tenant", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const from = row.status.trim().toLowerCase();
  const next = input.nextStatus.trim().toLowerCase();

  if (next === "scheduled") {
    return { ok: false, error: "use_schedule_action" };
  }

  if (next === from) {
    return { ok: false, error: "no_change" };
  }

  if (isTerminalCheckoutStatus(from)) {
    return { ok: false, error: "already_final" };
  }

  const edge = findCheckoutTransition(from, next, guard.roles);
  if (!edge) {
    return { ok: false, error: "invalid_transition" };
  }

  if (!isAdminLike(guard.roles)) {
    const ok = await canTenantAccessCheckout(guard.userId, row.leaseId, row.tenantUserId);
    if (!ok) {
      return { ok: false, error: "forbidden" };
    }
  }

  const adminNotes =
    input.adminNotes !== undefined && isAdminLike(guard.roles)
      ? input.adminNotes?.trim() || null
      : undefined;

  const clearScheduledAt = checkoutShouldClearScheduledAt(from, next);

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: {
      status: next,
      ...(clearScheduledAt ? { scheduledAt: null } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {})
    }
  });

  if (clearScheduledAt) {
    auditLog({
      type: "workflow",
      action: "checkout_status",
      actorUserId: guard.userId,
      recordType: "lease_checkout",
      recordId: row.id,
      meta: {
        from,
        to: next,
        scheduledAtCleared: true
      }
    });
  }

  revalidatePath("/tenant/checkout");
  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

function parseOptionalMoney(raw?: string | null): Prisma.Decimal | null {
  if (raw == null || !String(raw).trim()) {
    return null;
  }
  const n = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return new Prisma.Decimal(n);
}

/** Admin records move-out inspection; first save from `scheduled` promotes status to `inspected`. */
export async function saveLeaseCheckoutInspection(input: {
  checkoutId: string;
  inspectionOutcome: string;
  damagesSummary?: string | null;
  deductionAmount?: string | null;
  depositReturnAmount?: string | null;
}): Promise<CheckoutActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId.trim());
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const from = row.status.trim().toLowerCase();
  if (from !== "scheduled" && from !== "inspected") {
    return { ok: false, error: "wrong_status_for_inspection" };
  }

  const outcome = input.inspectionOutcome.trim();
  if (!outcome) {
    return { ok: false, error: "missing_outcome" };
  }

  const deduction = parseOptionalMoney(input.deductionAmount);
  const depositReturn = parseOptionalMoney(input.depositReturnAmount);
  if (input.deductionAmount?.trim() && deduction === null) {
    return { ok: false, error: "invalid_deduction" };
  }
  if (input.depositReturnAmount?.trim() && depositReturn === null) {
    return { ok: false, error: "invalid_deposit_return" };
  }

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: {
      inspectionOutcome: outcome,
      damagesSummary: input.damagesSummary?.trim() || null,
      deductionAmount: deduction,
      depositReturnAmount: depositReturn,
      ...(from === "scheduled" ? { status: "inspected" } : {})
    }
  });

  revalidatePath("/tenant/checkout");
  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

/** Admin closes checkout after inspection is recorded (`inspected` → `completed`). */
export async function completeLeaseCheckout(input: {
  checkoutId: string;
  adminNotes?: string | null;
}): Promise<CheckoutActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId.trim());
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const from = row.status.trim().toLowerCase();
  if (from !== "inspected") {
    return { ok: false, error: "must_inspect_first" };
  }
  if (!row.inspectionOutcome?.trim()) {
    return { ok: false, error: "missing_outcome" };
  }

  const extraNote = input.adminNotes?.trim();
  const scheduledAtCleared = checkoutShouldClearScheduledAt(from, "completed");

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      scheduledAt: null,
      ...(extraNote
        ? { adminNotes: row.adminNotes ? `${row.adminNotes}\n\n${extraNote}` : extraNote }
        : {})
    }
  });

  auditLog({
    type: "workflow",
    action: "checkout_complete",
    actorUserId: guard.userId,
    recordType: "lease_checkout",
    recordId: row.id,
    meta: { from, to: "completed", scheduledAtCleared }
  });

  revalidatePath("/tenant/checkout");
  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/owner/dashboard");
  return { ok: true };
}
