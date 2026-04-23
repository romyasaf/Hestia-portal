"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { parseOwnerContractType } from "@/lib/owner/contract";
import { normalizeLeaseStatus } from "@/lib/leases/status";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AdminEntityResult = { ok: true } | { ok: false; error: string };

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

  await prisma.lease.create({
    data: {
      unitId: uid,
      tenantUserId: tid,
      startDate: sd,
      endDate: ed,
      rentAmount: rent,
      depositAmount: deposit,
      status
    }
  });

  revalidatePath("/admin/leases");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/onboarding");
  revalidatePath("/listings");
  revalidatePath("/");
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

  await prisma.lease.update({
    where: { id: input.leaseId },
    data: {
      unitId: uid,
      tenantUserId: tid,
      startDate: sd,
      endDate: ed,
      rentAmount: rent,
      depositAmount: deposit,
      status: normalizeLeaseStatus(input.status ?? "active")
    }
  });

  revalidatePath("/admin/leases");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/onboarding");
  revalidatePath("/tenant/account");
  revalidatePath("/listings");
  revalidatePath("/");
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

  await prisma.unit.update({
    where: { id: input.unitId },
    data: {
      listingTitle: title || null,
      listingDescription: description || null,
      listingMonthlyPrice: lmp,
      listingCoverImageUrl: cover || null,
      listingGalleryUrls: gallery,
      listingAmenities: amenities
    }
  });

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${input.unitId}`);
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function createUnit(input: {
  propertyId: string;
  unitNumber: string;
  unitType?: string;
  bedrooms?: string;
  bathrooms?: string;
  monthlyRent?: string;
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

  try {
    await prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        ownerUserId: uo,
        unitNumber: num,
        unitType: input.unitType?.trim() || null,
        bedrooms,
        bathrooms,
        monthlyRent: mr,
        status: input.status?.trim() || "available"
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
  bedrooms?: string;
  bathrooms?: string;
  monthlyRent?: string;
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

  try {
    await prisma.unit.update({
      where: { id: input.unitId },
      data: {
        propertyId: input.propertyId,
        ...(uo !== undefined ? { ownerUserId: uo } : {}),
        unitNumber: num,
        unitType: input.unitType?.trim() || null,
        bedrooms,
        bathrooms,
        monthlyRent: mr,
        status: input.status?.trim() || "available"
      }
    });
  } catch {
    return { ok: false, error: "duplicate_unit" };
  }

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${input.unitId}`);
  revalidatePath("/admin/portfolio");
  revalidatePath("/owner/dashboard");
  revalidatePath("/listings");
  revalidatePath("/");
  return { ok: true };
}

export async function createTenantUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<AdminEntityResult> {
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

  const inserted = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
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

  const userId = inserted[0]?.id;
  if (!userId) {
    return { ok: false, error: "insert_failed" };
  }

  await prisma.userRole.create({
    data: { userId, roleId: role.id }
  });

  revalidatePath("/admin/tenants");
  return { ok: true };
}

export async function createOwnerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  /** Optional: set this user as `owner_user_id` on the property immediately. */
  propertyId?: string;
}): Promise<AdminEntityResult> {
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

  const propertyId = input.propertyId?.trim();
  if (propertyId) {
    const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!prop) {
      return { ok: false, error: "invalid_property" };
    }
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "email_in_use" };
  }

  const role = await prisma.role.findUnique({ where: { code: "owner" }, select: { id: true } });
  if (!role) {
    return { ok: false, error: "no_owner_role" };
  }

  const inserted = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
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

  const userId = inserted[0]?.id;
  if (!userId) {
    return { ok: false, error: "insert_failed" };
  }

  await prisma.userRole.create({
    data: { userId, roleId: role.id }
  });

  if (propertyId) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { ownerUserId: userId, ownerContractType: "managed" }
    });
    revalidatePath("/admin/properties");
    revalidatePath("/owner/dashboard");
  }

  revalidatePath("/admin/owners");
  revalidatePath("/admin/portfolio");
  return { ok: true };
}

async function assertUserHasOwnerRole(userId: string): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: { id: userId, userRoles: { some: { role: { code: "owner" } } } },
    select: { id: true }
  });
  return Boolean(row);
}

export async function createProperty(input: {
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  country?: string;
  /** Optional building-level owner. */
  ownerUserId?: string;
  /** When an owner is set: operator (fixed lease) or managed. Ignored if no owner. */
  ownerContractType?: string;
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const addressLine1 = input.addressLine1.trim();
  const city = input.city.trim();
  if (!code || !name || !addressLine1 || !city) {
    return { ok: false, error: "missing_fields" };
  }
  if (code.length > 64 || name.length > 200) {
    return { ok: false, error: "field_too_long" };
  }

  const ownerId = input.ownerUserId?.trim() || null;
  if (ownerId) {
    const ownerOk = await assertUserHasOwnerRole(ownerId);
    if (!ownerOk) {
      return { ok: false, error: "owner_must_have_role" };
    }
  }

  try {
    await prisma.property.create({
      data: {
        code,
        name,
        addressLine1,
        city,
        country: input.country?.trim() || "Qatar",
        ownerUserId: ownerId,
        ownerContractType: ownerId ? parseOwnerContractType(input.ownerContractType) : "managed",
        ownerFinancialAccess: false
      }
    });
  } catch {
    return { ok: false, error: "duplicate_code" };
  }

  revalidatePath("/admin/properties");
  revalidatePath("/admin/portfolio");
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

  await prisma.leadInquiry.update({
    where: { id: lead.id },
    data: {
      convertedTenantUserId: userId,
      convertedAt: new Date(),
      status: "closed"
    }
  });

  revalidatePath("/admin/tenants");
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
