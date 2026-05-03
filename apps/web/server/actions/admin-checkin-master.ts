"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AdminCheckinMasterResult = { ok: true } | { ok: false; error: string };

export async function createCheckinInventoryMasterItem(input: {
  itemName: string;
  conditionHint?: string;
  notes?: string;
}): Promise<AdminCheckinMasterResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const name = input.itemName?.trim();
  if (!name || name.length > 200) {
    return { ok: false, error: "missing_name" };
  }
  const last = await prisma.checkinInventoryMasterItem.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true }
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;
  await prisma.checkinInventoryMasterItem.create({
    data: {
      sortOrder,
      itemName: name,
      conditionHint: input.conditionHint?.trim() || null,
      notes: input.notes?.trim() || null
    }
  });
  revalidatePath("/admin/check-in-inventory");
  revalidatePath("/admin/units");
  return { ok: true };
}

export async function updateCheckinInventoryMasterItem(input: {
  id: string;
  itemName: string;
  conditionHint?: string;
  notes?: string;
  sortOrder: number;
}): Promise<AdminCheckinMasterResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.id?.trim();
  const name = input.itemName?.trim();
  if (!id || !name || name.length > 200) {
    return { ok: false, error: "missing_fields" };
  }
  const row = await prisma.checkinInventoryMasterItem.findUnique({ where: { id }, select: { id: true } });
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  await prisma.checkinInventoryMasterItem.update({
    where: { id },
    data: {
      itemName: name,
      conditionHint: input.conditionHint?.trim() || null,
      notes: input.notes?.trim() || null,
      sortOrder: Number.isFinite(input.sortOrder) ? Math.max(0, Math.floor(input.sortOrder)) : 0
    }
  });
  revalidatePath("/admin/check-in-inventory");
  revalidatePath("/admin/units");
  return { ok: true };
}

export async function deleteCheckinInventoryMasterItem(input: { id: string }): Promise<AdminCheckinMasterResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.id?.trim();
  if (!id) {
    return { ok: false, error: "missing_id" };
  }
  const count = await prisma.checkinInventoryMasterItem.count();
  if (count <= 1) {
    return { ok: false, error: "cannot_delete_last" };
  }
  try {
    await prisma.checkinInventoryMasterItem.delete({ where: { id } });
  } catch {
    return { ok: false, error: "delete_failed" };
  }
  revalidatePath("/admin/check-in-inventory");
  revalidatePath("/admin/units");
  return { ok: true };
}
