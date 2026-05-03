"use server";

import { revalidatePath } from "next/cache";
import { parseOwnerContractType } from "@/lib/owner/contract";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";
import { assertUserHasOwnerRole } from "@/server/actions/admin-entities";

export type OwnerProfileActionResult = { ok: true } | { ok: false; error: string };

export async function upsertOwnerProfile(input: {
  ownerUserId: string;
  ownerType: string;
  whatsAppPhone?: string;
  addressLine?: string;
  notes?: string;
  qidNumber?: string;
  qidExpiry?: string;
  qidPhotoUrl?: string;
  commercialRegistrationNumber?: string;
  crDocumentUrl?: string;
  defaultOwnerContractType: string;
}): Promise<OwnerProfileActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const oid = input.ownerUserId?.trim();
  if (!oid) {
    return { ok: false, error: "missing_owner" };
  }
  const ok = await assertUserHasOwnerRole(oid);
  if (!ok) {
    return { ok: false, error: "not_owner" };
  }

  const ot = input.ownerType?.trim().toLowerCase();
  const ownerType = ot === "company" ? "company" : "individual";
  const defCt = parseOwnerContractType(input.defaultOwnerContractType);

  let qidExpiry: Date | null = null;
  if (input.qidExpiry?.trim()) {
    const d = new Date(`${input.qidExpiry.trim()}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      qidExpiry = d;
    }
  }

  await prisma.ownerProfile.upsert({
    where: { userId: oid },
    create: {
      userId: oid,
      ownerType,
      ownershipScope: "building_owner",
      whatsAppPhone: input.whatsAppPhone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      notes: input.notes?.trim() || null,
      qidNumber: input.qidNumber?.trim() || null,
      qidExpiry,
      qidPhotoUrl: input.qidPhotoUrl?.trim() || null,
      commercialRegistrationNumber: input.commercialRegistrationNumber?.trim() || null,
      crDocumentUrl: input.crDocumentUrl?.trim() || null,
      defaultOwnerContractType: defCt
    },
    update: {
      ownerType,
      whatsAppPhone: input.whatsAppPhone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      notes: input.notes?.trim() || null,
      qidNumber: input.qidNumber?.trim() || null,
      qidExpiry,
      qidPhotoUrl: input.qidPhotoUrl?.trim() || null,
      commercialRegistrationNumber: input.commercialRegistrationNumber?.trim() || null,
      crDocumentUrl: input.crDocumentUrl?.trim() || null,
      defaultOwnerContractType: defCt,
      updatedAt: new Date()
    }
  });

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${oid}`);
  return { ok: true };
}
