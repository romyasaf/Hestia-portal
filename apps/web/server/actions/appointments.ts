"use server";

import { revalidatePath } from "next/cache";
import { checkoutShouldClearScheduledAt } from "@/lib/scheduling/appointment-fields";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";
import { getCheckoutById } from "@/server/queries/checkout";
import { getTenantRequestJobById } from "@/server/queries/tenant-requests";

export type AppointmentActionResult = { ok: true } | { ok: false; error: string };

/** Admin sets / updates a visit time on a tenant-request job. */
export async function setTenantRequestSchedule(input: {
  jobId: string;
  scheduledAt: string;
}): Promise<AppointmentActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getTenantRequestJobById(input.jobId.trim());
  if (!row || row.sourceType !== TENANT_REQUEST_SOURCE_TYPE) {
    return { ok: false, error: "not_found" };
  }

  const at = new Date(input.scheduledAt);
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "invalid_datetime" };
  }

  await prisma.job.update({
    where: { id: row.id },
    data: { scheduledAt: at }
  });

  auditLog({
    type: "scheduling",
    action: "tenant_request_set_schedule",
    actorUserId: guard.userId,
    recordType: "job",
    recordId: row.id,
    meta: { scheduledAt: at.toISOString() }
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${row.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/requests");
  return { ok: true };
}

export async function clearTenantRequestSchedule(input: { jobId: string }): Promise<AppointmentActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getTenantRequestJobById(input.jobId.trim());
  if (!row || row.sourceType !== TENANT_REQUEST_SOURCE_TYPE) {
    return { ok: false, error: "not_found" };
  }

  await prisma.job.update({
    where: { id: row.id },
    data: { scheduledAt: null }
  });

  auditLog({
    type: "scheduling",
    action: "tenant_request_clear_schedule",
    actorUserId: guard.userId,
    recordType: "job",
    recordId: row.id
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${row.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/tenant/requests");
  return { ok: true };
}

/** Admin moves checkout inspection to a new time while staying `scheduled`. */
export async function rescheduleLeaseCheckoutInspection(input: {
  checkoutId: string;
  scheduledAt: string;
}): Promise<AppointmentActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId.trim());
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  if (row.status.trim().toLowerCase() !== "scheduled") {
    return { ok: false, error: "not_scheduled" };
  }

  const at = new Date(input.scheduledAt);
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "invalid_datetime" };
  }

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: { scheduledAt: at }
  });

  auditLog({
    type: "scheduling",
    action: "checkout_reschedule",
    actorUserId: guard.userId,
    recordType: "lease_checkout",
    recordId: row.id,
    meta: { scheduledAt: at.toISOString() }
  });

  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/tenant/checkout");
  return { ok: true };
}

/** Admin clears inspection time and returns checkout to `requested` for re-coordination. */
export async function cancelLeaseCheckoutInspectionSlot(input: { checkoutId: string }): Promise<AppointmentActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckoutById(input.checkoutId.trim());
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  const from = row.status.trim().toLowerCase();
  if (!checkoutShouldClearScheduledAt(from, "requested")) {
    return { ok: false, error: "not_cancellable_slot" };
  }

  await prisma.leaseCheckOut.update({
    where: { id: row.id },
    data: {
      status: "requested",
      scheduledAt: null
    }
  });

  auditLog({
    type: "scheduling",
    action: "checkout_cancel_inspection_slot",
    actorUserId: guard.userId,
    recordType: "lease_checkout",
    recordId: row.id
  });

  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${row.id}`);
  revalidatePath("/tenant/checkout");
  return { ok: true };
}
