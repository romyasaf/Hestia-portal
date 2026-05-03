"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { normalizeUnitInventoryCategory } from "@/lib/inventory/categories";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type UnitInventoryResult = { ok: true } | { ok: false; error: string };

export async function createUnitInventoryItem(input: {
  unitId: string;
  itemName: string;
  category: string;
  quantity: string;
  conditionLabel: string;
  notes?: string;
  photoUrl?: string;
}): Promise<UnitInventoryResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const unitId = input.unitId?.trim();
  const itemName = input.itemName?.trim();
  if (!unitId || !itemName) {
    return { ok: false, error: "missing_fields" };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const q = Number.parseFloat(input.quantity?.trim() || "1");
  if (!Number.isFinite(q) || q <= 0) {
    return { ok: false, error: "invalid_quantity" };
  }

  await prisma.unitInventoryItem.create({
    data: {
      unitId,
      itemName,
      category: normalizeUnitInventoryCategory(input.category),
      quantity: new Prisma.Decimal(q),
      conditionLabel: (input.conditionLabel?.trim() || "good").slice(0, 64),
      notes: input.notes?.trim() || null,
      photoUrl: input.photoUrl?.trim() || null
    }
  });

  revalidatePath(`/admin/units/${unitId}`);
  return { ok: true };
}

export async function deleteUnitInventoryItem(input: { itemId: string }): Promise<UnitInventoryResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const id = input.itemId?.trim();
  if (!id) {
    return { ok: false, error: "missing_fields" };
  }

  const row = await prisma.unitInventoryItem.findUnique({ where: { id }, select: { unitId: true } });
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  await prisma.unitInventoryItem.delete({ where: { id } });
  revalidatePath(`/admin/units/${row.unitId}`);
  return { ok: true };
}

/** Append rows from global master checklist (name + notes); categories default to `other`. */
export async function copyMasterInventoryToUnit(input: { unitId: string }): Promise<UnitInventoryResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const unitId = input.unitId?.trim();
  if (!unitId) {
    return { ok: false, error: "missing_fields" };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  let masters: { id: string; itemName: string; conditionHint: string | null; notes: string | null }[] = [];
  try {
    masters = await prisma.checkinInventoryMasterItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { itemName: "asc" }]
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return { ok: false, error: "no_master_items" };
    }
    throw e;
  }

  if (masters.length === 0) {
    return { ok: false, error: "no_master_items" };
  }

  await prisma.$transaction(
    masters.map((m) =>
      prisma.unitInventoryItem.create({
        data: {
          unitId,
          itemName: m.itemName,
          category: "other",
          quantity: new Prisma.Decimal(1),
          conditionLabel: (m.conditionHint?.trim() || "good").slice(0, 64),
          notes: m.notes?.trim() || null
        }
      })
    )
  );

  revalidatePath(`/admin/units/${unitId}`);
  return { ok: true };
}
