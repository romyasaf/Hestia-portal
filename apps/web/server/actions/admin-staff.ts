"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { isStaffPortalPermission, type StaffPortalPermission } from "@/lib/rbac/staff-permissions";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";
import type { AdminEntityResult } from "@/server/actions/admin-entities";

function normalizePermissionInput(raw: readonly string[]): StaffPortalPermission[] {
  const out: StaffPortalPermission[] = [];
  for (const p of raw) {
    if (isStaffPortalPermission(p) && !out.includes(p)) {
      out.push(p);
    }
  }
  return out;
}

export async function createStaffUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  permissions: readonly string[];
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const permissions = normalizePermissionInput(input.permissions);
  if (permissions.length === 0) {
    return { ok: false, error: "permissions_required" };
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

  const role = await prisma.role.findUnique({ where: { code: "staff" }, select: { id: true } });
  if (!role) {
    return { ok: false, error: "no_staff_role" };
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

  await prisma.$transaction([
    prisma.userRole.create({
      data: { userId, roleId: role.id }
    }),
    prisma.staffPermissionGrant.createMany({
      data: permissions.map((permissionCode) => ({ userId, permissionCode }))
    })
  ]);

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaffUser(input: {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  permissions: readonly string[];
}): Promise<AdminEntityResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const permissions = normalizePermissionInput(input.permissions);
  if (permissions.length === 0) {
    return { ok: false, error: "permissions_required" };
  }

  const staff = await prisma.user.findFirst({
    where: {
      id: input.userId,
      userRoles: { some: { role: { code: "staff" } } }
    },
    select: { id: true }
  });
  if (!staff) {
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: {
        email,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        isActive: input.isActive
      }
    }),
    prisma.staffPermissionGrant.deleteMany({ where: { userId: input.userId } }),
    prisma.staffPermissionGrant.createMany({
      data: permissions.map((permissionCode) => ({
        userId: input.userId,
        permissionCode
      }))
    })
  ]);

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${input.userId}`);
  return { ok: true };
}
