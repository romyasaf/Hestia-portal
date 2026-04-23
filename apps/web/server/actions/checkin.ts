"use server";

import { revalidatePath } from "next/cache";
import { normalizeCheckInSeverity } from "@/lib/checkin/severities";
import { findCheckInTransition, isTerminalCheckInStatus } from "@/lib/checkin/statuses";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";
import {
  canTenantAccessCheckIn,
  getCheckInById,
  getOpenCheckInForLease
} from "@/server/queries/checkin";

export type CheckInActionResult = { ok: true } | { ok: false; error: string };

function isAdminLike(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export async function submitLeaseCheckIn(input: {
  tenantNotes?: string;
  issues: { summary: string; details?: string; severity?: string; areaLabel?: string }[];
}): Promise<CheckInActionResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  void input;
  /** Initial move-in check-in is created only through `/tenant/onboarding/check-in` (inventory + issues). */
  return { ok: false, error: "use_onboarding_flow" };
}

export async function appendLeaseCheckInIssue(input: {
  checkInId: string;
  summary: string;
  details?: string;
  severity?: string;
  areaLabel?: string;
}): Promise<CheckInActionResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const summary = input.summary?.trim();
  if (!summary) {
    return { ok: false, error: "missing_summary" };
  }

  const row = await getCheckInById(input.checkInId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const st = row.status.trim().toLowerCase();
  if (st !== "submitted" && st !== "under_review") {
    return { ok: false, error: "cannot_add_issue" };
  }

  const ok = await canTenantAccessCheckIn(guard.userId, row.leaseId, row.tenantUserId);
  if (!ok) {
    return { ok: false, error: "forbidden" };
  }

  await prisma.leaseCheckInIssue.create({
    data: {
      checkInId: row.id,
      summary,
      details: input.details?.trim() || null,
      severity: normalizeCheckInSeverity(input.severity),
      areaLabel: input.areaLabel?.trim() || null
    }
  });

  revalidatePath("/tenant/checkin");
  revalidatePath(`/admin/checkins/${row.id}`);
  revalidatePath("/admin/checkins");
  return { ok: true };
}

export async function updateLeaseCheckInStatus(input: {
  checkInId: string;
  nextStatus: string;
  adminNotes?: string | null;
}): Promise<CheckInActionResult> {
  const guard = await guardActionRoles(["tenant", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getCheckInById(input.checkInId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const from = row.status.trim().toLowerCase();
  const next = input.nextStatus.trim().toLowerCase();

  if (next === from) {
    return { ok: false, error: "no_change" };
  }

  if (isTerminalCheckInStatus(from)) {
    return { ok: false, error: "already_final" };
  }

  const edge = findCheckInTransition(from, next, guard.roles);
  if (!edge) {
    return { ok: false, error: "invalid_transition" };
  }

  if (!isAdminLike(guard.roles)) {
    const ok = await canTenantAccessCheckIn(guard.userId, row.leaseId, row.tenantUserId);
    if (!ok) {
      return { ok: false, error: "forbidden" };
    }
  }

  const terminalReview = next === "approved" || next === "rejected";
  const adminNotes =
    input.adminNotes !== undefined && isAdminLike(guard.roles)
      ? input.adminNotes?.trim() || null
      : undefined;

  await prisma.leaseCheckIn.update({
    where: { id: row.id },
    data: {
      status: next,
      reviewedAt: terminalReview ? new Date() : row.reviewedAt,
      ...(adminNotes !== undefined ? { adminNotes } : {})
    }
  });

  revalidatePath("/tenant/checkin");
  revalidatePath("/admin/checkins");
  revalidatePath(`/admin/checkins/${row.id}`);
  return { ok: true };
}
