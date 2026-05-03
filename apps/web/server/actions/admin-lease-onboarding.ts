"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AdminLeaseOnboardingResult = { ok: true } | { ok: false; error: string };

export async function approveLeaseChequeDelivery(input: { leaseId: string }): Promise<AdminLeaseOnboardingResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.leaseId.trim();
  const row = await prisma.lease.findUnique({
    where: { id },
    select: {
      id: true,
      chequeDeliveryState: true,
      onboardingCompletedAt: true
    }
  });
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  if (row.onboardingCompletedAt) {
    return { ok: false, error: "already_onboarded" };
  }
  const st = row.chequeDeliveryState.trim().toLowerCase();
  if (st !== "marked_delivered") {
    return { ok: false, error: "not_awaiting_approval" };
  }
  const now = new Date();
  await prisma.lease.update({
    where: { id },
    data: {
      chequeDeliveryState: "approved",
      chequeApprovedAt: now,
      chequeApprovedByUserId: guard.userId,
      chequeReceivedAt: now,
      chequeReceivedByUserId: guard.userId,
      onboardingChequeReceived: true
    }
  });
  auditLog({
    type: "workflow",
    action: "lease_cheque_delivery_approved",
    actorUserId: guard.userId,
    recordType: "lease",
    recordId: id,
    meta: {}
  });
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${id}`);
  revalidatePath("/tenant/onboarding");
  revalidatePath("/tenant/onboarding/cheques");
  return { ok: true };
}
