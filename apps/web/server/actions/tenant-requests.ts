"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import {
  findTenantRequestTransition,
  isTenantRequestKind,
  isTerminalTenantRequestStatus
} from "@/lib/tenant-requests/statuses";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";
import {
  canTenantReadTenantRequest,
  getTenantRequestJobById,
  toTenantRequestDetail
} from "@/server/queries/tenant-requests";

async function uniqueJobNo(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const candidate = `RQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const clash = await prisma.job.findUnique({ where: { jobNo: candidate }, select: { id: true } });
    if (!clash) {
      return candidate;
    }
  }
  throw new Error("Could not allocate request number");
}

function isAdminLike(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export type TenantRequestActionResult = { ok: true } | { ok: false; error: string };

export async function createTenantRequest(input: {
  kind: string;
  title: string;
  details?: string;
}): Promise<TenantRequestActionResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (!isTenantRequestKind(input.kind)) {
    return { ok: false, error: "invalid_kind" };
  }

  const title = input.title?.trim();
  if (!title) {
    return { ok: false, error: "missing_title" };
  }

  const lease = await getOperationalLeaseForTenant(guard.userId);
  if (!lease) {
    return { ok: false, error: "no_active_lease" };
  }

  const jobNo = await uniqueJobNo();

  await prisma.job.create({
    data: {
      jobNo,
      sourceType: TENANT_REQUEST_SOURCE_TYPE,
      sourceId: lease.leaseId,
      requesterUserId: guard.userId,
      propertyId: lease.building.id,
      unitId: lease.unit.id,
      requestKind: input.kind,
      title,
      scope: input.details?.trim() || null,
      status: "submitted"
    }
  });

  revalidatePath("/tenant/requests");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function updateTenantRequestStatus(input: {
  jobId: string;
  nextStatus: string;
}): Promise<TenantRequestActionResult> {
  const guard = await guardActionRoles(["tenant", "admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const row = await getTenantRequestJobById(input.jobId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const next = input.nextStatus.trim().toLowerCase();
  const from = row.status.trim().toLowerCase();

  if (next === from) {
    return { ok: false, error: "no_change" };
  }

  if (isTerminalTenantRequestStatus(from)) {
    return { ok: false, error: "already_final" };
  }

  const edge = findTenantRequestTransition(from, next, guard.roles);
  if (!edge) {
    return { ok: false, error: "invalid_transition" };
  }

  if (!isAdminLike(guard.roles)) {
    const detail = toTenantRequestDetail(row);
    const okRead = await canTenantReadTenantRequest(guard.userId, detail);
    if (!okRead) {
      return { ok: false, error: "forbidden" };
    }
  }

  await prisma.job.update({
    where: { id: row.id },
    data: { status: next }
  });

  auditLog({
    type: "workflow",
    action: "tenant_request_status",
    actorUserId: guard.userId,
    recordType: "job",
    recordId: row.id,
    meta: { from, to: next }
  });

  revalidatePath("/tenant/requests");
  revalidatePath(`/tenant/requests/${row.id}`);
  revalidatePath("/tenant/dashboard");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${row.id}`);
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
