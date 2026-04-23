import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";

export type TenantRequestListRow = {
  id: string;
  jobNo: string;
  requestKind: string | null;
  title: string;
  status: string;
  scope: string | null;
  createdAt: string;
};

export type TenantRequestDetail = TenantRequestListRow & {
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  propertyCode: string | null;
  propertyName: string | null;
  unitNumber: string | null;
};

export type AdminTenantRequestListRow = TenantRequestListRow & {
  requesterName: string;
  requesterEmail: string;
  propertyLabel: string | null;
};

function rowFromJob(j: {
  id: string;
  jobNo: string;
  requestKind: string | null;
  title: string;
  status: string;
  scope: string | null;
  createdAt: Date;
}): TenantRequestListRow {
  return {
    id: j.id,
    jobNo: j.jobNo,
    requestKind: j.requestKind,
    title: j.title,
    status: j.status.trim().toLowerCase(),
    scope: j.scope,
    createdAt: j.createdAt.toISOString()
  };
}

const tenantRequestWhere = { sourceType: TENANT_REQUEST_SOURCE_TYPE };

/**
 * Requests for the tenant’s **current** active lease: same property/unit, and `source_id` is
 * either null (legacy) or equals the active lease id (preferred).
 */
export async function listTenantRequestsForLease(
  userId: string,
  activeLeaseId: string,
  propertyId: string,
  unitId: string
) {
  const rows = await prisma.job.findMany({
    where: {
      ...tenantRequestWhere,
      requesterUserId: userId,
      propertyId,
      unitId,
      OR: [{ sourceId: null }, { sourceId: activeLeaseId }]
    },
    orderBy: { createdAt: "desc" },
    take: 40
  });
  return rows.map(rowFromJob);
}

export async function listTenantRequestsForAdmin(
  filters: { kind: string; status: string; q: string },
  take = 80
): Promise<AdminTenantRequestListRow[]> {
  const and: Prisma.JobWhereInput[] = [{ sourceType: TENANT_REQUEST_SOURCE_TYPE }];

  if (filters.kind && filters.kind !== "all") {
    and.push({ requestKind: filters.kind });
  }

  if (filters.status && filters.status !== "all") {
    if (filters.status === "open") {
      and.push({
        NOT: {
          OR: [
            { status: { equals: "completed", mode: "insensitive" } },
            { status: { equals: "rejected", mode: "insensitive" } },
            { status: { equals: "cancelled", mode: "insensitive" } }
          ]
        }
      });
    } else {
      and.push({ status: { equals: filters.status, mode: "insensitive" } });
    }
  }

  const q = filters.q.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { jobNo: { contains: q, mode: "insensitive" } },
        { scope: { contains: q, mode: "insensitive" } },
        { requester: { fullName: { contains: q, mode: "insensitive" } } },
        { requester: { email: { contains: q, mode: "insensitive" } } }
      ]
    });
  }

  const rows = await prisma.job.findMany({
    where: { AND: and },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      requester: { select: { fullName: true, email: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });

  return rows.map((j) => {
    let propertyLabel: string | null = null;
    if (j.property) {
      const u = j.unit?.unitNumber;
      propertyLabel = u ? `${j.property.name} · Unit ${u}` : j.property.name;
    } else if (j.unit) {
      propertyLabel = `Unit ${j.unit.unitNumber}`;
    }
    return {
      ...rowFromJob(j),
      requesterName: j.requester.fullName,
      requesterEmail: j.requester.email,
      propertyLabel
    };
  });
}

export async function getTenantRequestJobById(id: string) {
  return prisma.job.findFirst({
    where: { id, ...tenantRequestWhere },
    include: {
      requester: { select: { id: true, fullName: true, email: true } },
      property: { select: { id: true, code: true, name: true } },
      unit: { select: { id: true, unitNumber: true } }
    }
  });
}

export function toTenantRequestDetail(
  j: NonNullable<Awaited<ReturnType<typeof getTenantRequestJobById>>>
): TenantRequestDetail {
  return {
    id: j.id,
    jobNo: j.jobNo,
    requestKind: j.requestKind,
    title: j.title,
    status: j.status.trim().toLowerCase(),
    scope: j.scope,
    createdAt: j.createdAt.toISOString(),
    propertyId: j.propertyId,
    unitId: j.unitId,
    leaseId: j.sourceId,
    requesterUserId: j.requesterUserId,
    requesterName: j.requester.fullName,
    requesterEmail: j.requester.email,
    propertyCode: j.property?.code ?? null,
    propertyName: j.property?.name ?? null,
    unitNumber: j.unit?.unitNumber ?? null
  };
}

export async function canTenantReadTenantRequest(
  userId: string,
  detail: TenantRequestDetail
): Promise<boolean> {
  if (detail.requesterUserId !== userId) {
    return false;
  }
  const lease = await getOperationalLeaseForTenant(userId);
  if (lease) {
    if (detail.propertyId !== lease.building.id || detail.unitId !== lease.unit.id) {
      return false;
    }
    if (detail.leaseId != null && detail.leaseId !== lease.leaseId) {
      return false;
    }
    return true;
  }
  if (detail.leaseId) {
    const mine = await prisma.lease.findFirst({
      where: { id: detail.leaseId, tenantUserId: userId },
      select: { id: true }
    });
    return !!mine;
  }
  return false;
}

export const ADMIN_TENANT_REQUEST_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "renewal", label: "Renewal" },
  { value: "transfer", label: "Transfer" },
  { value: "handover", label: "Handover" }
];

export const ADMIN_TENANT_REQUEST_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

const KIND_VALUES = new Set(ADMIN_TENANT_REQUEST_KIND_OPTIONS.map((o) => o.value));
const STATUS_VALUES = new Set(ADMIN_TENANT_REQUEST_STATUS_OPTIONS.map((o) => o.value));

export function parseAdminTenantRequestListParams(sp: Record<string, string | string[] | undefined>): {
  kind: string;
  status: string;
  q: string;
} {
  const pick = (key: string): string => {
    const v = sp[key];
    return typeof v === "string" ? v : "";
  };
  const kindRaw = pick("kind");
  const statusRaw = pick("status");
  return {
    kind: KIND_VALUES.has(kindRaw) ? kindRaw : "all",
    status: STATUS_VALUES.has(statusRaw) ? statusRaw : "open",
    q: pick("q").slice(0, 200)
  };
}
