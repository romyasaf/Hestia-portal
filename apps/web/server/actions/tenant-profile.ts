"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeTenantLifecycleStatus, normalizeTenantType } from "@/lib/tenants/constants";
import { guardActionRoles } from "@/server/auth/action-guard";

export type TenantProfileActionResult = { ok: true } | { ok: false; error: string };

export async function upsertTenantProfile(input: {
  tenantUserId: string;
  tenantType: string;
  tenantLifecycleStatus?: string;
  whatsAppPhone?: string;
  /** Individual */
  nationality?: string;
  qidNumber?: string;
  qidExpiry?: string;
  qidPhotoUrl?: string;
  passportNumber?: string;
  passportPhotoUrl?: string;
  dateOfBirth?: string;
  /** Company */
  companyName?: string;
  contactPersonName?: string;
  commercialRegistrationNumber?: string;
  crDocumentUrl?: string;
  companyAddress?: string;
  authorizedSignatory?: string;
  /** Shared */
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}): Promise<TenantProfileActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const tid = input.tenantUserId?.trim();
  if (!tid) {
    return { ok: false, error: "missing_tenant" };
  }

  const tenant = await prisma.user.findFirst({
    where: { id: tid, userRoles: { some: { role: { code: "tenant" } } } },
    select: { id: true }
  });
  if (!tenant) {
    return { ok: false, error: "not_tenant" };
  }

  const parseDate = (raw?: string): Date | null => {
    if (!raw?.trim()) return null;
    const d = new Date(`${raw.trim()}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const tenantType = normalizeTenantType(input.tenantType);
  const lifecycle = normalizeTenantLifecycleStatus(input.tenantLifecycleStatus);

  const baseShared = {
    tenantType,
    tenantLifecycleStatus: lifecycle,
    whatsAppPhone: input.whatsAppPhone?.trim() || null,
    emergencyContactName: input.emergencyContactName?.trim() || null,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
    emergencyContactRelationship: input.emergencyContactRelationship?.trim() || null
  };

  const individualOnly =
    tenantType === "individual"
      ? {
          nationality: input.nationality?.trim() || null,
          qidNumber: input.qidNumber?.trim() || null,
          qidExpiry: parseDate(input.qidExpiry),
          qidPhotoUrl: input.qidPhotoUrl?.trim() || null,
          passportNumber: input.passportNumber?.trim() || null,
          passportPhotoUrl: input.passportPhotoUrl?.trim() || null,
          dateOfBirth: parseDate(input.dateOfBirth),
          companyName: null,
          contactPersonName: null,
          commercialRegistrationNumber: null,
          crDocumentUrl: null,
          companyAddress: null,
          authorizedSignatory: null
        }
      : {
          nationality: null,
          qidNumber: null,
          qidExpiry: null,
          qidPhotoUrl: null,
          passportNumber: null,
          passportPhotoUrl: null,
          dateOfBirth: null,
          companyName: input.companyName?.trim() || null,
          contactPersonName: input.contactPersonName?.trim() || null,
          commercialRegistrationNumber: input.commercialRegistrationNumber?.trim() || null,
          crDocumentUrl: input.crDocumentUrl?.trim() || null,
          companyAddress: input.companyAddress?.trim() || null,
          authorizedSignatory: input.authorizedSignatory?.trim() || null
        };

  await prisma.tenantProfile.upsert({
    where: { userId: tid },
    create: {
      userId: tid,
      ...baseShared,
      ...individualOnly
    },
    update: {
      ...baseShared,
      ...individualOnly,
      updatedAt: new Date()
    }
  });

  if (tenantType === "company") {
    const cn = input.companyName?.trim();
    if (cn) {
      await prisma.user.update({
        where: { id: tid },
        data: { fullName: cn }
      });
    }
  }

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tid}`);
  return { ok: true };
}
