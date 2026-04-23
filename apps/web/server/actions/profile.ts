"use server";

import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";
import { revalidatePath } from "next/cache";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/** Portal users only — not public marketing roles. */
export async function updateMyProfile(input: { fullName: string; phone?: string | null }): Promise<UpdateProfileResult> {
  const guard = await guardActionRoles(["tenant", "staff", "owner", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error === "forbidden" ? "forbidden" : "unauthorized" };
  }
  const fullName = input.fullName.trim().slice(0, 200);
  if (!fullName) {
    return { ok: false, error: "missing_name" };
  }
  const phone = input.phone?.trim() ? input.phone.trim().slice(0, 40) : null;

  try {
    await prisma.user.update({
      where: { id: guard.userId },
      data: { fullName, phone }
    });
  } catch {
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/tenant/profile");
  revalidatePath("/staff/profile");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}
