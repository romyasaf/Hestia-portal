"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AdminCheckoutResult = { ok: true } | { ok: false; error: string };

export async function updateLeaseCheckOut(input: {
  checkOutId: string;
  scheduledAt?: string | null;
  inspectionNotes?: string | null;
  finalDecisionNotes?: string | null;
  adminNotes?: string | null;
  inspectionOutcome?: string | null;
  damagesSummary?: string | null;
  status?: string;
}): Promise<AdminCheckoutResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.checkOutId.trim();
  if (!id) {
    return { ok: false, error: "invalid" };
  }
  const row = await prisma.leaseCheckOut.findUnique({
    where: { id },
    select: { id: true, lease: { select: { unitId: true } } }
  });
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  let scheduledAt: Date | null | undefined;
  if (input.scheduledAt !== undefined) {
    if (input.scheduledAt == null || input.scheduledAt === "") {
      scheduledAt = null;
    } else {
      const d = new Date(input.scheduledAt);
      scheduledAt = Number.isNaN(d.getTime()) ? null : d;
    }
  }
  await prisma.leaseCheckOut.update({
    where: { id },
    data: {
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
      ...(input.inspectionNotes !== undefined
        ? { inspectionNotes: input.inspectionNotes?.trim() || null }
        : {}),
      ...(input.finalDecisionNotes !== undefined
        ? { finalDecisionNotes: input.finalDecisionNotes?.trim() || null }
        : {}),
      ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes?.trim() || null } : {}),
      ...(input.inspectionOutcome !== undefined
        ? { inspectionOutcome: input.inspectionOutcome?.trim() || null }
        : {}),
      ...(input.damagesSummary !== undefined
        ? { damagesSummary: input.damagesSummary?.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status.trim() } : {})
    }
  });
  const unitId = row.lease?.unitId;
  if (unitId) {
    revalidatePath(`/admin/portfolio/units/${unitId}`);
  }
  revalidatePath("/admin/leases");
  return { ok: true };
}
