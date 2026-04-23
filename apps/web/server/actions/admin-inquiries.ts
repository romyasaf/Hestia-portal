"use server";

import { prisma } from "@/lib/prisma";
import { isLeadInquiryStatus } from "@/lib/inquiries/constants";
import { guardActionRoles } from "@/server/auth/action-guard";
import { revalidatePath } from "next/cache";

export type UpdateLeadInquiryResult = { ok: true } | { ok: false; error: string };

export async function updateLeadInquiryStatus(input: {
  id: string;
  status: string;
}): Promise<UpdateLeadInquiryResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error === "forbidden" ? "forbidden" : "unauthorized" };
  }
  if (!isLeadInquiryStatus(input.status)) {
    return { ok: false, error: "invalid_status" };
  }
  const id = input.id.trim();
  if (!id) {
    return { ok: false, error: "missing_id" };
  }

  try {
    const row = await prisma.leadInquiry.findUnique({ where: { id }, select: { id: true } });
    if (!row) {
      return { ok: false, error: "not_found" };
    }

    await prisma.leadInquiry.update({
      where: { id },
      data: { status: input.status }
    });
  } catch {
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/admin/inquiries");
  return { ok: true };
}
