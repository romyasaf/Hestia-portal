"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { parseOwnerContractType } from "@/lib/owner/contract";
import {
  normalizeDigitalSignatureStatus,
  normalizeLeasePaymentFrequency
} from "@/lib/leases/extended-fields";
import { leaseStatusActiveWhere, normalizeLeaseStatus } from "@/lib/leases/status";
import { findOverlappingActiveLeaseOnUnit, syncUnitOccupancyFromLeases } from "@/lib/units/occupancy-sync";
import { utcTodayDateOnly } from "@/lib/units/public-listing";
import { normalizeTenantType } from "@/lib/tenants/constants";
import { getTableColumnSet } from "@/lib/db/table-columns";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AdminEntityResult =
  | { ok: true; propertyId?: string }
  | { ok: false; error: string };

export type CreateTenantUserResult = { ok: true; userId: string } | { ok: false; error: string };

function moneyDecimal(s: string): Prisma.Decimal | null {
  const n = Number.parseFloat(s.trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return new Prisma.Decimal(n);
}

export async function createLease(input: {
  unitId: string;
  tenantUserId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount?: string;
  status?: string;
  paymentFrequency?: string;
  digitalSignatureStatus?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const rent = moneyDecimal(input.rentAmount);
  if (!rent) {
    return { ok: false, error: "invalid_rent" };
  }
  const deposit = moneyDecimal(input.depositAmount ?? "0") ?? new Prisma.Decimal(0);

  const sd = new Date(`${input.startDate.trim()}T12:00:00.000Z`);
  const ed = new Date(`${input.endDate.trim()}T12:00:00.000Z`);
  if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime()) || ed < sd) {
    return { ok: false, error: "invalid_dates" };
  }

  const tid = input.tenantUserId?.trim();
  const uid = input.unitId?.trim();
  if (!tid || !uid) {
    return { ok: false, error: "missing_lease_links" };
  }

  const tenant = await prisma.user.findFirst({
    where: {
      id: tid,
      userRoles: { some: { role: { code: "tenant" } } }
    },
    select: { id: true }
  });
  if (!tenant) {
    return { ok: false, error: "invalid_tenant" };
  }

  const unit = await prisma.unit.findUnique({
    where: { id: uid },
    select: { id: true }
  });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const status = normalizeLeaseStatus(input.status ?? "active");
  const paymentFrequency = normalizeLeasePaymentFrequency(input.paymentFrequency);
  const digitalSignatureStatus = normalizeDigitalSignatureStatus(input.digitalSignatureStatus);

  if (status === "active") {
    const clash = await findOverlappingActiveLeaseOnUnit({ unitId: uid, startDate: sd, endDate: ed });
    if (clash) {
      return { ok: false, error: "lease_unit_active_overlap" };
    }
  }

  await prisma.lease.create({
    data: {
      unitId: uid,
      tenantUserId: tid,
      startDate: sd,
      endDate: ed,
      rentAmount: rent,
      depositAmount: deposit,
      status,
      paymentFrequency,
      digitalSignatureStatus
    }
  });

  await syncUnitOccupancyFromLeases(uid);

  revalidatePath("/admin/leases");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/onboarding");
  revalidatePath("/listings");
  revalidatePath("/");
  revalidatePath("/admin/units");
  return { ok: true };
}

export async function updateLease(input: {
  leaseId: string;
  unitId: string;
  tenantUserId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount?: string;
  status?: string;
  paymentFrequency?: string;
  digitalSignatureStatus?: string;
  unsignedContractDocumentUrl?: string;
  signedContractDocumentUrl?: string;
  chequeDeliveryState?: string;
  chequeAppointmentAt?: string;
  chequeAppointmentNotes?: string;
  onboardingContractSigned?: boolean;
  onboardingChequeReceived?: boolean;
  onboardingCheckinCompleted?: boolean;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const rent = moneyDecimal(input.rentAmount);
  if (!rent) {
    return { ok: false, error: "invalid_rent" };
  }
  const deposit = moneyDecimal(input.depositAmount ?? "0") ?? new Prisma.Decimal(0);
  const sd = new Date(`${input.startDate.trim()}T12:00:00.000Z`);
  const ed = new Date(`${input.endDate.trim()}T12:00:00.000Z`);
  if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime()) || ed < sd) {
    return { ok: false, error: "invalid_dates" };
  }

  const tid = input.tenantUserId?.trim();
  const uid = input.unitId?.trim();
  if (!tid || !uid) {
    return { ok: false, error: "missing_lease_links" };
  }

  const tenant = await prisma.user.findFirst({
    where: {
      id: tid,
      userRoles: { some: { role: { code: "tenant" } } }
    },
    select: { id: true }
  });
  if (!tenant) {
    return { ok: false, error: "invalid_tenant" };
  }

  const unit = await prisma.unit.findUnique({
    where: { id: uid },
    select: { id: true }
  });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const existingLease = await prisma.lease.findUnique({
    where: { id: input.leaseId },
    select: { unitId: true }
  });
  if (!existingLease) {
    return { ok: false, error: "invalid_lease" };
  }

  const nextStatus = normalizeLeaseStatus(input.status ?? "active");
  if (nextStatus === "active") {
    const clash = await findOverlappingActiveLeaseOnUnit({
      unitId: uid,
      startDate: sd,
      endDate: ed,
      excludeLeaseId: input.leaseId
    });
    if (clash) {
      return { ok: false, error: "lease_unit_active_overlap" };
    }
  }

  let chequeAppt: Date | null | undefined = undefined;
  if (input.chequeAppointmentAt !== undefined) {
    const raw = input.chequeAppointmentAt.trim();
    if (raw === "") {
      chequeAppt = null;
    } else {
      const d = new Date(`${raw}T12:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "invalid_cheque_appointment" };
      }
      chequeAppt = d;
    }
  }

  const data: Prisma.LeaseUpdateInput = {
    unit: { connect: { id: uid } },
    tenant: { connect: { id: tid } },
    startDate: sd,
    endDate: ed,
    rentAmount: rent,
    depositAmount: deposit,
    status: nextStatus
  };

  if (input.paymentFrequency !== undefined) {
    data.paymentFrequency = normalizeLeasePaymentFrequency(input.paymentFrequency);
  }
  if (input.digitalSignatureStatus !== undefined) {
    data.digitalSignatureStatus = normalizeDigitalSignatureStatus(input.digitalSignatureStatus);
  }
  if (input.unsignedContractDocumentUrl !== undefined) {
    data.unsignedContractDocumentUrl = input.unsignedContractDocumentUrl?.trim() || null;
  }
  if (input.signedContractDocumentUrl !== undefined) {
    data.signedContractDocumentUrl = input.signedContractDocumentUrl?.trim() || null;
  }
  if (input.chequeDeliveryState !== undefined && input.chequeDeliveryState.trim()) {
    data.chequeDeliveryState = input.chequeDeliveryState.trim().toLowerCase();
  }
  if (chequeAppt !== undefined) {
    data.chequeAppointmentAt = chequeAppt;
  }
  if (input.chequeAppointmentNotes !== undefined) {
    data.chequeAppointmentNotes = input.chequeAppointmentNotes?.trim() || null;
  }
  if (input.onboardingContractSigned !== undefined) {
    data.onboardingContractSigned = input.onboardingContractSigned;
  }
  if (input.onboardingChequeReceived !== undefined) {
    data.onboardingChequeReceived = input.onboardingChequeReceived;
  }
  if (input.onboardingCheckinCompleted !== undefined) {
    data.onboardingCheckinCompleted = input.onboardingCheckinCompleted;
  }

  await prisma.lease.update({
    where: { id: input.leaseId },
    data
  });

  if (existingLease.unitId !== uid) {
    await syncUnitOccupancyFromLeases(existingLease.unitId);
  }
  await syncUnitOccupancyFromLeases(uid);

  revalidatePath("/admin/leases");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/onboarding");
  revalidatePath("/tenant/account");
  revalidatePath("/listings");
  revalidatePath("/");
  revalidatePath("/admin/units");
  return { ok: true };
}

function splitToUniqueList(raw: string): string[] {
  const parts = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

export async function updateUnitListing(input: {
  unitId: string;
  listingTitle: string;
  listingDescription: string;
  listingMonthlyPrice: string;
  listingCoverImageUrl: string;
  listingGalleryUrlsRaw: string;
  listingAmenitiesRaw: string;
  /** Internal notes, optional */
  listingNotes?: string;
  /** ISO date yyyy-mm-dd or empty */
  listingAvailabilityDate?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const unit = await prisma.unit.findUnique({ where: { id: input.unitId }, select: { id: true } });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const title = input.listingTitle.trim();
  const description = input.listingDescription.trim();
  const cover = input.listingCoverImageUrl.trim();
  const lmp = input.listingMonthlyPrice.trim() ? moneyDecimal(input.listingMonthlyPrice) : null;

  if (cover.length > 2048) {
    return { ok: false, error: "cover_url_too_long" };
  }

  const gallery = splitToUniqueList(input.listingGalleryUrlsRaw).filter((u) => u.length <= 2048).slice(0, 24);
  const amenities = splitToUniqueList(input.listingAmenitiesRaw).slice(0, 60);

  const notes = input.listingNotes?.trim() || null;
  let listingAvailabilityDate: Date | null = null;
  if (input.listingAvailabilityDate?.trim()) {
    const d = new Date(`${input.listingAvailabilityDate.trim()}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      listingAvailabilityDate = d;
    }
  }

  await prisma.unit.update({
    where: { id: input.unitId },
    data: {
      listingTitle: title || null,
      listingDescription: description || null,
      listingMonthlyPrice: lmp,
      listingCoverImageUrl: cover || null,
      listingGalleryUrls: gallery,
      listingAmenities: amenities,
      listingNotes: notes,
      listingAvailabilityDate
    }
  });

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${input.unitId}`);
  revalidatePath(`/admin/portfolio/units/${input.unitId}`);
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function updateUnitCheckinInventoryTemplate(input: {
  unitId: string;
  /** Extra checklist lines for this unit only (merged after the global master at tenant check-in). */
  lines: { id: string; label: string; defaultCondition?: string; notes?: string }[];
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const uid = input.unitId?.trim();
  if (!uid) {
    return { ok: false, error: "invalid_unit" };
  }
  const unit = await prisma.unit.findUnique({ where: { id: uid }, select: { id: true } });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const normalized: { id: string; label: string; defaultCondition?: string; notes?: string }[] = [];
  let idx = 0;
  for (const l of input.lines) {
    const label = l.label?.trim();
    if (!label || label.length > 200) {
      continue;
    }
    const id = (l.id?.trim() || `unit-line-${idx}`).slice(0, 120);
    const dc = l.defaultCondition?.trim();
    const notes = l.notes?.trim();
    normalized.push({
      id,
      label,
      ...(dc ? { defaultCondition: dc.slice(0, 500) } : {}),
      ...(notes ? { notes: notes.slice(0, 2000) } : {})
    });
    idx++;
    if (normalized.length >= 120) {
      break;
    }
  }

  await prisma.unit.update({
    where: { id: uid },
    data: { checkinInventoryTemplate: normalized as unknown as Prisma.InputJsonValue }
  });

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${uid}`);
  revalidatePath("/tenant/onboarding/check-in");
  return { ok: true };
}

export async function createUnit(input: {
  propertyId: string;
  unitNumber: string;
  unitType?: string;
  floor?: string;
  bedrooms?: string;
  bathrooms?: string;
  monthlyRent?: string;
  areaSqm?: string;
  furnishingStatus?: string;
  status?: string;
  /** Optional unit-level owner (must have owner role). */
  unitOwnerUserId?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const num = input.unitNumber?.trim();
  if (!num) {
    return { ok: false, error: "missing_unit_number" };
  }

  const prop = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true }
  });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }

  const uo = input.unitOwnerUserId?.trim() || null;
  if (uo) {
    const okOwner = await assertUserHasOwnerRole(uo);
    if (!okOwner) {
      return { ok: false, error: "unit_owner_must_have_role" };
    }
  }

  const brParsed = input.bedrooms?.trim() ? Number.parseInt(input.bedrooms, 10) : NaN;
  const baParsed = input.bathrooms?.trim() ? Number.parseInt(input.bathrooms, 10) : NaN;
  const bedrooms = Number.isFinite(brParsed) ? brParsed : null;
  const bathrooms = Number.isFinite(baParsed) ? baParsed : null;
  const mr = input.monthlyRent?.trim() ? moneyDecimal(input.monthlyRent) : null;
  const area = input.areaSqm?.trim() ? moneyDecimal(input.areaSqm) : null;
  const furnish = input.furnishingStatus?.trim() || null;

  const today = utcTodayDateOnly();
  let ownershipSource: "inherited_from_building_contract" | "direct_unit_owner_contract" | "no_owner_contract" =
    "no_owner_contract";
  if (uo) {
    ownershipSource = "direct_unit_owner_contract";
  } else {
    const whole = await prisma.ownerContract.findFirst({
      where: {
        propertyId: input.propertyId,
        propertyScope: { in: ["whole_building", "whole_villa"] },
        startDate: { lte: today },
        endDate: { gte: today }
      },
      select: { id: true }
    });
    if (whole) {
      ownershipSource = "inherited_from_building_contract";
    }
  }

  try {
    await prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        ownerUserId: uo,
        unitNumber: num,
        unitType: input.unitType?.trim() || null,
        floor: input.floor?.trim() || null,
        bedrooms,
        bathrooms,
        monthlyRent: mr,
        areaSqm: area,
        furnishingStatus: furnish,
        status: input.status?.trim() || "available",
        ownershipSource
      }
    });
  } catch {
    return { ok: false, error: "duplicate_unit" };
  }

  revalidatePath("/admin/units");
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function updateUnit(input: {
  unitId: string;
  propertyId: string;
  unitNumber: string;
  unitType?: string;
  floor?: string;
  bedrooms?: string;
  bathrooms?: string;
  monthlyRent?: string;
  areaSqm?: string;
  furnishingStatus?: string;
  status?: string;
  /** Optional unit-level owner; empty clears direct owner (building owner may still apply). */
  unitOwnerUserId?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const num = input.unitNumber?.trim();
  if (!num) {
    return { ok: false, error: "missing_unit_number" };
  }

  const prop = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true }
  });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }

  const uo =
    input.unitOwnerUserId === undefined
      ? undefined
      : input.unitOwnerUserId.trim() === ""
        ? null
        : input.unitOwnerUserId.trim();
  if (uo) {
    const okOwner = await assertUserHasOwnerRole(uo);
    if (!okOwner) {
      return { ok: false, error: "unit_owner_must_have_role" };
    }
  }

  const brParsed = input.bedrooms?.trim() ? Number.parseInt(input.bedrooms, 10) : NaN;
  const baParsed = input.bathrooms?.trim() ? Number.parseInt(input.bathrooms, 10) : NaN;
  const bedrooms = Number.isFinite(brParsed) ? brParsed : null;
  const bathrooms = Number.isFinite(baParsed) ? baParsed : null;
  const mr = input.monthlyRent?.trim() ? moneyDecimal(input.monthlyRent) : null;
  const areaPatch =
    input.areaSqm !== undefined
      ? { areaSqm: input.areaSqm.trim() ? moneyDecimal(input.areaSqm) : null }
      : {};
  const furnishPatch =
    input.furnishingStatus !== undefined
      ? { furnishingStatus: input.furnishingStatus.trim() || null }
      : {};
  const floorPatch = input.floor !== undefined ? { floor: input.floor.trim() || null } : {};

  let ownershipSourcePatch: { ownershipSource: string } | undefined;
  if (uo !== undefined) {
    const today = utcTodayDateOnly();
    if (uo) {
      ownershipSourcePatch = { ownershipSource: "direct_unit_owner_contract" };
    } else {
      const whole = await prisma.ownerContract.findFirst({
        where: {
          propertyId: input.propertyId,
          propertyScope: { in: ["whole_building", "whole_villa"] },
          startDate: { lte: today },
          endDate: { gte: today }
        },
        select: { id: true }
      });
      ownershipSourcePatch = {
        ownershipSource: whole ? "inherited_from_building_contract" : "no_owner_contract"
      };
    }
  }

  try {
    await prisma.unit.update({
      where: { id: input.unitId },
      data: {
        propertyId: input.propertyId,
        ...(uo !== undefined ? { ownerUserId: uo } : {}),
        unitNumber: num,
        unitType: input.unitType?.trim() || null,
        ...floorPatch,
        bedrooms,
        bathrooms,
        monthlyRent: mr,
        ...areaPatch,
        ...furnishPatch,
        status: input.status?.trim() || "available",
        ...(ownershipSourcePatch ?? {})
      }
    });
  } catch {
    return { ok: false, error: "duplicate_unit" };
  }

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${input.unitId}`);
  revalidatePath(`/admin/portfolio/units/${input.unitId}`);
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveUnit(input: { unitId: string }): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.unitId.trim();
  if (!id) {
    return { ok: false, error: "invalid_unit" };
  }
  const today = utcTodayDateOnly();
  const active = await prisma.lease.count({
    where: {
      unitId: id,
      status: leaseStatusActiveWhere(),
      startDate: { lte: today },
      endDate: { gte: today }
    }
  });
  if (active > 0) {
    return { ok: false, error: "unit_has_active_lease" };
  }
  await prisma.unit.update({
    where: { id },
    data: { status: "archived" }
  });
  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${id}`);
  revalidatePath("/admin/portfolio");
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteUnitWithSafety(input: { unitId: string }): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const id = input.unitId.trim();
  if (!id) {
    return { ok: false, error: "invalid_unit" };
  }
  const u = await prisma.unit.findUnique({
    where: { id },
    select: {
      _count: {
        select: { leases: true, expenses: true, ownerContracts: true, tickets: true, jobs: true }
      }
    }
  });
  if (!u) {
    return { ok: false, error: "invalid_unit" };
  }
  const n =
    u._count.leases +
    u._count.expenses +
    u._count.ownerContracts +
    u._count.tickets +
    u._count.jobs;
  if (n > 0) {
    return { ok: false, error: "unit_has_history_use_archive" };
  }
  await prisma.unit.delete({ where: { id } });
  revalidatePath("/admin/units");
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function deletePropertyWithSafety(input: { propertyId: string }): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const pid = input.propertyId.trim();
  if (!pid) {
    return { ok: false, error: "invalid_property" };
  }
  const [tickets, expenses, contracts, jobsOnProperty, units] = await Promise.all([
    prisma.ticket.count({ where: { propertyId: pid } }),
    prisma.expense.count({ where: { propertyId: pid } }),
    prisma.ownerContract.count({ where: { propertyId: pid } }),
    prisma.job.count({ where: { propertyId: pid } }),
    prisma.unit.findMany({
      where: { propertyId: pid },
      select: {
        id: true,
        _count: {
          select: { leases: true, expenses: true, ownerContracts: true, tickets: true, jobs: true }
        }
      }
    })
  ]);
  const unitBlocked = units.some(
    (x) =>
      x._count.leases +
        x._count.expenses +
        x._count.ownerContracts +
        x._count.tickets +
        x._count.jobs >
      0
  );
  if (tickets > 0 || expenses > 0 || contracts > 0 || jobsOnProperty > 0 || unitBlocked) {
    return { ok: false, error: "property_has_history" };
  }
  await prisma.property.delete({ where: { id: pid } });
  revalidatePath("/admin/properties");
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function createTenantUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  /** `individual` (default) or `company` — seeds `tenant_profiles`. */
  tenantType?: string;
}): Promise<CreateTenantUserResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim();
  if (!email || !password || password.length < 8 || !fullName) {
    return { ok: false, error: "missing_or_weak_password" };
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "email_in_use" };
  }

  const role = await prisma.role.findUnique({ where: { code: "tenant" }, select: { id: true } });
  if (!role) {
    return { ok: false, error: "no_tenant_role" };
  }

  const tt = normalizeTenantType(input.tenantType);

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        INSERT INTO users (email, password_hash, full_name, phone, is_active)
        VALUES (
          ${email},
          crypt(${password}, gen_salt('bf')),
          ${fullName},
          ${input.phone?.trim() || null},
          true
        )
        RETURNING id
      `);

      const uid = inserted[0]?.id;
      if (!uid) {
        throw new Error("insert_failed");
      }

      await tx.userRole.create({
        data: { userId: uid, roleId: role.id }
      });

      await tx.tenantProfile.create({
        data: {
          userId: uid,
          tenantType: tt,
          tenantLifecycleStatus: "active",
          ...(tt === "company" ? { companyName: fullName } : {})
        }
      });

      return uid;
    });

    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${userId}`);
    return { ok: true, userId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return { ok: false, error: "database_schema_outdated" };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "email_in_use" };
    }
    if (e instanceof Error && e.message === "insert_failed") {
      return { ok: false, error: "insert_failed" };
    }
    throw e;
  }
}

export async function updateOwnerUser(input: {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive?: boolean;
  /** When set and non-empty, must be at least 8 characters. */
  newPassword?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const uid = input.userId?.trim();
  if (!uid) {
    return { ok: false, error: "invalid_user" };
  }

  const ownerOk = await assertUserHasOwnerRole(uid);
  if (!ownerOk) {
    return { ok: false, error: "not_owner" };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim();
  if (!email || !fullName || fullName.length > 200 || email.length > 320) {
    return { ok: false, error: "missing_fields" };
  }

  const other = await prisma.user.findFirst({
    where: { email, NOT: { id: uid } },
    select: { id: true }
  });
  if (other) {
    return { ok: false, error: "email_in_use" };
  }

  const pw = input.newPassword?.trim();
  if (pw && pw.length < 8) {
    return { ok: false, error: "weak_password" };
  }

  const isActive = input.isActive !== undefined ? input.isActive : undefined;

  if (pw) {
    const activeVal = isActive === undefined ? true : isActive;
    await prisma.$executeRaw(Prisma.sql`
      UPDATE users
      SET email = ${email},
          full_name = ${fullName},
          phone = ${input.phone?.trim() || null},
          is_active = ${activeVal},
          password_hash = crypt(${pw}, gen_salt('bf'))
      WHERE id = ${uid}::uuid
    `);
  } else {
    await prisma.user.update({
      where: { id: uid },
      data: {
        email,
        fullName,
        phone: input.phone?.trim() || null,
        ...(isActive !== undefined ? { isActive } : {})
      }
    });
  }

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${uid}`);
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function deleteOwnerUser(input: { userId: string }): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const uid = input.userId?.trim();
  if (!uid) {
    return { ok: false, error: "invalid_user" };
  }
  if (uid === guard.userId) {
    return { ok: false, error: "cannot_delete_self" };
  }

  const ownerOk = await assertUserHasOwnerRole(uid);
  if (!ownerOk) {
    return { ok: false, error: "not_owner" };
  }

  const ownerRole = await prisma.role.findUnique({ where: { code: "owner" }, select: { id: true } });
  if (!ownerRole) {
    return { ok: false, error: "no_owner_role" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.property.updateMany({ where: { ownerUserId: uid }, data: { ownerUserId: null } });
      await tx.unit.updateMany({ where: { ownerUserId: uid }, data: { ownerUserId: null } });
      await tx.lease.updateMany({ where: { chequeApprovedByUserId: uid }, data: { chequeApprovedByUserId: null } });
      await tx.userRole.delete({ where: { userId_roleId: { userId: uid, roleId: ownerRole.id } } });
      const remaining = await tx.userRole.count({ where: { userId: uid } });
      if (remaining === 0) {
        await tx.user.delete({ where: { id: uid } });
      }
    });
  } catch {
    return { ok: false, error: "delete_blocked_refs" };
  }

  revalidatePath("/admin/owners");
  revalidatePath("/admin/portfolio");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/units");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function assertUserHasOwnerRole(userId: string): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: { id: userId, userRoles: { some: { role: { code: "owner" } } } },
    select: { id: true }
  });
  return Boolean(row);
}

const ADDRESS_PART_MAX = 128;

function trimAddressPart(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!v) {
    return { ok: false, error: "missing_fields" };
  }
  if (v.length > ADDRESS_PART_MAX) {
    return { ok: false, error: "field_too_long" };
  }
  return { ok: true, value: v };
}

function baseBuildingCodeFromName(name: string): string {
  const s = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (s.length ? s.slice(0, 40) : "BUILDING") || "BUILDING";
}

/** Assigns a unique `properties.code` when the admin does not enter one (new-building flow). */
export async function allocateUniqueBuildingCode(name: string): Promise<string | null> {
  const base = baseBuildingCodeFromName(name);
  for (let i = 0; i < 32; i++) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const code = `${base}-${suffix}`.slice(0, 64);
    const exists = await prisma.property.findUnique({ where: { code }, select: { id: true } });
    if (!exists) {
      return code;
    }
  }
  return null;
}

export async function createProperty(input: {
  /** Optional; when omitted or empty, a unique code is generated from the building name. */
  code?: string;
  name: string;
  addressZone: string;
  addressStreet: string;
  addressBuildingNumber: string;
  city: string;
  country?: string;
  addressAreaName?: string;
  addressNotes?: string;
  googleMapsUrl?: string;
  /** Optional building-level owner. */
  ownerUserId?: string;
  /** When an owner is set: operator or managed. Ignored if no owner. */
  ownerContractType?: string;
  /** Physical classification; default apartment_building. */
  propertyType?: string;
  /** managed_by_hestia | location_only_not_managed; default managed_by_hestia. */
  managementStatus?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const name = input.name.trim();
  const city = input.city.trim();
  const z = trimAddressPart(input.addressZone);
  const s = trimAddressPart(input.addressStreet);
  const b = trimAddressPart(input.addressBuildingNumber);
  if (!name || !city || !z.ok || !s.ok || !b.ok) {
    return { ok: false, error: "missing_fields" };
  }

  const manualCode = input.code?.trim();
  let code: string;
  if (manualCode) {
    code = manualCode.toUpperCase();
  } else {
    const allocated = await allocateUniqueBuildingCode(name);
    if (!allocated) {
      return { ok: false, error: "code_alloc_failed" };
    }
    code = allocated;
  }

  if (code.length > 64 || name.length > 200 || city.length > 120) {
    return { ok: false, error: "field_too_long" };
  }
  const area = input.addressAreaName?.trim();
  const notes = input.addressNotes?.trim();
  if (area && area.length > 200) {
    return { ok: false, error: "field_too_long" };
  }
  if (notes && notes.length > 2000) {
    return { ok: false, error: "field_too_long" };
  }
  const maps = input.googleMapsUrl?.trim() || null;
  if (maps && maps.length > 2048) {
    return { ok: false, error: "field_too_long" };
  }

  const ownerId = input.ownerUserId?.trim() || null;
  if (ownerId) {
    const ownerOk = await assertUserHasOwnerRole(ownerId);
    if (!ownerOk) {
      return { ok: false, error: "owner_must_have_role" };
    }
  }

  const PROPERTY_TYPES = new Set([
    "apartment_building",
    "villa",
    "compound",
    "commercial_building",
    "mixed_use"
  ]);
  const MANAGEMENT_STATUSES = new Set(["managed_by_hestia", "location_only_not_managed"]);
  const ptRaw = (input.propertyType ?? "apartment_building").trim().toLowerCase();
  const msRaw = (input.managementStatus ?? "managed_by_hestia").trim().toLowerCase();
  if (!PROPERTY_TYPES.has(ptRaw)) {
    return { ok: false, error: "invalid_property_type" };
  }
  if (!MANAGEMENT_STATUSES.has(msRaw)) {
    return { ok: false, error: "invalid_management_status" };
  }

  try {
    const propertyCols = await getTableColumnSet("properties");
    const data: Prisma.PropertyUncheckedCreateInput = {
      code,
      name,
      addressZone: z.value,
      addressStreet: s.value,
      addressBuildingNumber: b.value,
      addressAreaName: area || null,
      addressNotes: notes || null,
      city,
      country: input.country?.trim() || "Qatar",
      googleMapsUrl: maps,
      ownerUserId: ownerId,
      ownerContractType: ownerId ? parseOwnerContractType(input.ownerContractType) : "managed",
      ownerFinancialAccess: false
    };
    if (propertyCols.has("property_type")) {
      data.propertyType = ptRaw;
    }
    if (propertyCols.has("management_status")) {
      data.managementStatus = msRaw;
    }
    const created = await prisma.property.create({
      data,
      select: { id: true }
    });
    revalidatePath("/admin/properties");
    revalidatePath("/admin/portfolio");
    revalidatePath("/owner/dashboard");
    return { ok: true, propertyId: created.id };
  } catch {
    return { ok: false, error: "duplicate_code" };
  }
}

export async function updatePropertyStructuredAddress(input: {
  propertyId: string;
  name: string;
  addressZone: string;
  addressStreet: string;
  addressBuildingNumber: string;
  city: string;
  country?: string;
  addressAreaName?: string;
  addressNotes?: string;
  googleMapsUrl?: string;
  /** Pass `""` to clear building-level owner. */
  ownerUserId?: string | null;
  ownerContractType?: string;
  propertyType?: string;
  managementStatus?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const pid = input.propertyId.trim();
  const prop = await prisma.property.findUnique({ where: { id: pid }, select: { id: true } });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }

  const name = input.name.trim();
  const city = input.city.trim();
  const z = trimAddressPart(input.addressZone);
  const s = trimAddressPart(input.addressStreet);
  const b = trimAddressPart(input.addressBuildingNumber);
  if (!name || !city || !z.ok || !s.ok || !b.ok) {
    return { ok: false, error: "missing_fields" };
  }
  if (name.length > 200 || city.length > 120) {
    return { ok: false, error: "field_too_long" };
  }
  const area = input.addressAreaName?.trim();
  const notes = input.addressNotes?.trim();
  if (area && area.length > 200) {
    return { ok: false, error: "field_too_long" };
  }
  if (notes && notes.length > 2000) {
    return { ok: false, error: "field_too_long" };
  }

  const mapsRaw = input.googleMapsUrl;
  const maps = mapsRaw === undefined ? undefined : mapsRaw.trim() || null;
  if (maps && maps.length > 2048) {
    return { ok: false, error: "field_too_long" };
  }

  const data: Prisma.PropertyUpdateInput = {
    name,
    addressZone: z.value,
    addressStreet: s.value,
    addressBuildingNumber: b.value,
    addressAreaName: area || null,
    addressNotes: notes || null,
    city,
    country: input.country?.trim() || "Qatar"
  };
  if (maps !== undefined) {
    data.googleMapsUrl = maps;
  }

  if (input.ownerUserId !== undefined) {
    const oid = input.ownerUserId === null || input.ownerUserId === "" ? null : input.ownerUserId.trim();
    if (oid) {
      const ownerOk = await assertUserHasOwnerRole(oid);
      if (!ownerOk) {
        return { ok: false, error: "owner_must_have_role" };
      }
      data.owner = { connect: { id: oid } };
      data.ownerContractType = parseOwnerContractType(input.ownerContractType);
    } else {
      data.owner = { disconnect: true };
      data.ownerContractType = "managed";
    }
  }

  const propertyCols = await getTableColumnSet("properties");
  const PROPERTY_TYPES = new Set([
    "apartment_building",
    "villa",
    "compound",
    "commercial_building",
    "mixed_use"
  ]);
  const MANAGEMENT_STATUSES = new Set(["managed_by_hestia", "location_only_not_managed"]);
  if (input.propertyType !== undefined) {
    const pt = input.propertyType.trim().toLowerCase();
    if (!PROPERTY_TYPES.has(pt)) {
      return { ok: false, error: "invalid_property_type" };
    }
    if (propertyCols.has("property_type")) {
      data.propertyType = pt;
    }
  }
  if (input.managementStatus !== undefined) {
    const ms = input.managementStatus.trim().toLowerCase();
    if (!MANAGEMENT_STATUSES.has(ms)) {
      return { ok: false, error: "invalid_management_status" };
    }
    if (propertyCols.has("management_status")) {
      data.managementStatus = ms;
    }
  }

  await prisma.property.update({
    where: { id: pid },
    data
  });

  revalidatePath("/admin/properties");
  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/properties/${pid}/edit`);
  revalidatePath(`/admin/portfolio/properties/${pid}`);
  revalidatePath("/owner/buildings");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function assignPropertyOwner(input: {
  propertyId: string;
  /** Set to null to clear building-level owner (units may still have direct owners). */
  ownerUserId: string | null;
  /** When assigning an owner; ignored when clearing. */
  ownerContractType?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const pid = input.propertyId.trim();
  const prop = await prisma.property.findUnique({ where: { id: pid }, select: { id: true } });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }

  const oid = input.ownerUserId?.trim() || null;
  if (oid) {
    const ok = await assertUserHasOwnerRole(oid);
    if (!ok) {
      return { ok: false, error: "owner_must_have_role" };
    }
  }

  await prisma.property.update({
    where: { id: pid },
    data: {
      ownerUserId: oid,
      ownerContractType: oid ? parseOwnerContractType(input.ownerContractType) : "managed"
    }
  });

  revalidatePath("/admin/properties");
  revalidatePath("/admin/units");
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function updatePropertyOwnerContractType(input: {
  propertyId: string;
  ownerContractType: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const pid = input.propertyId.trim();
  const prop = await prisma.property.findUnique({
    where: { id: pid },
    select: { id: true, ownerUserId: true }
  });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }
  if (!prop.ownerUserId) {
    return { ok: false, error: "owner_required_for_contract" };
  }

  const ct = parseOwnerContractType(input.ownerContractType);
  await prisma.property.update({
    where: { id: pid },
    data: { ownerContractType: ct }
  });

  revalidatePath("/admin/properties");
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function updateTenantUser(input: {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const tenant = await prisma.user.findFirst({
    where: {
      id: input.userId,
      userRoles: { some: { role: { code: "tenant" } } }
    },
    select: { id: true }
  });
  if (!tenant) {
    return { ok: false, error: "not_found" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !input.fullName?.trim()) {
    return { ok: false, error: "missing_fields" };
  }

  const clash = await prisma.user.findFirst({
    where: { email, NOT: { id: input.userId } },
    select: { id: true }
  });
  if (clash) {
    return { ok: false, error: "email_in_use" };
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      email,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      isActive: input.isActive
    }
  });

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${input.userId}`);
  return { ok: true };
}

export async function updatePropertyOwnerFinancialAccess(input: {
  propertyId: string;
  ownerFinancialAccess: boolean;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  await prisma.property.update({
    where: { id: input.propertyId.trim() },
    data: { ownerFinancialAccess: input.ownerFinancialAccess }
  });

  revalidatePath("/admin/properties");
  revalidatePath("/owner/financials");
  revalidatePath("/owner/dashboard");
  return { ok: true };
}

/** Create a tenant user account from a tenant-type lead inquiry (manual + lead conversion path). */
export async function convertTenantLeadInquiry(input: {
  leadId: string;
  password: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const password = input.password;
  if (!password || password.length < 8) {
    return { ok: false, error: "missing_or_weak_password" };
  }

  const lead = await prisma.leadInquiry.findUnique({ where: { id: input.leadId.trim() } });
  if (!lead) {
    return { ok: false, error: "not_found" };
  }
  if (lead.inquiryType.trim().toLowerCase() !== "tenant") {
    return { ok: false, error: "wrong_inquiry_type" };
  }
  if (lead.convertedTenantUserId) {
    return { ok: false, error: "already_converted" };
  }

  const email = lead.email.trim().toLowerCase();
  const fullName = lead.fullName?.trim();
  if (!email || !fullName) {
    return { ok: false, error: "missing_fields" };
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "email_in_use" };
  }

  const role = await prisma.role.findUnique({ where: { code: "tenant" }, select: { id: true } });
  if (!role) {
    return { ok: false, error: "no_tenant_role" };
  }

  const inserted = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO users (email, password_hash, full_name, phone, is_active)
    VALUES (
      ${email},
      crypt(${password}, gen_salt('bf')),
      ${fullName},
      ${lead.phone?.trim() || null},
      true
    )
    RETURNING id
  `);

  const userId = inserted[0]?.id;
  if (!userId) {
    return { ok: false, error: "insert_failed" };
  }

  await prisma.userRole.create({
    data: { userId, roleId: role.id }
  });

  await prisma.tenantProfile.create({
    data: {
      userId,
      tenantType: "individual",
      tenantLifecycleStatus: "active"
    }
  });

  await prisma.leadInquiry.update({
    where: { id: lead.id },
    data: {
      convertedTenantUserId: userId,
      convertedAt: new Date(),
      status: "closed"
    }
  });

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${userId}`);
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
