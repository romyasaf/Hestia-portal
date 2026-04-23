import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";

/** Renovation / contracting jobs — everything except portal tenant requests (renewal / transfer / handover). */
const projectJobWhere: Prisma.JobWhereInput = {
  NOT: { sourceType: TENANT_REQUEST_SOURCE_TYPE }
};

export type AdminProjectListRow = {
  id: string;
  jobNo: string;
  sourceType: string;
  title: string;
  status: string;
  scope: string | null;
  createdAt: string;
  scheduledAt: string | null;
  requesterName: string;
  requesterEmail: string;
  propertyLabel: string | null;
};

export type ProjectStatusFilter =
  | "all"
  | "inquiry"
  | "quoted"
  | "approved"
  | "in_progress"
  | "completed";

const PROJECT_STATUS_FILTERS: readonly ProjectStatusFilter[] = [
  "all",
  "inquiry",
  "quoted",
  "approved",
  "in_progress",
  "completed"
];

export function parseProjectStatusFilter(value: string | undefined): ProjectStatusFilter {
  if (value && (PROJECT_STATUS_FILTERS as readonly string[]).includes(value)) {
    return value as ProjectStatusFilter;
  }
  return "all";
}

function statusClause(filter: ProjectStatusFilter): Prisma.JobWhereInput | null {
  switch (filter) {
    case "all":
      return null;
    case "inquiry":
      return {
        status: { in: ["draft", "submitted", "inquiry", "pending_review"], mode: "insensitive" }
      };
    case "quoted":
      return { status: { in: ["quoted", "under_review"], mode: "insensitive" } };
    case "approved":
      return { status: { equals: "approved", mode: "insensitive" } };
    case "in_progress":
      return { status: { in: ["in_progress", "scheduled"], mode: "insensitive" } };
    case "completed":
      return { status: { equals: "completed", mode: "insensitive" } };
    default:
      return null;
  }
}

export async function listProjectJobsForAdmin(
  filters: { status: ProjectStatusFilter; q: string },
  take = 100
): Promise<AdminProjectListRow[]> {
  const and: Prisma.JobWhereInput[] = [projectJobWhere];
  const bucket = statusClause(filters.status);
  if (bucket) {
    and.push(bucket);
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
      id: j.id,
      jobNo: j.jobNo,
      sourceType: j.sourceType,
      title: j.title,
      status: j.status.trim().toLowerCase(),
      scope: j.scope,
      createdAt: j.createdAt.toISOString(),
      scheduledAt: j.scheduledAt?.toISOString() ?? null,
      requesterName: j.requester.fullName,
      requesterEmail: j.requester.email,
      propertyLabel
    };
  });
}

export type AdminProjectJobDetail = AdminProjectListRow;

export async function getAdminProjectJobById(id: string): Promise<AdminProjectJobDetail | null> {
  const j = await prisma.job.findFirst({
    where: { AND: [{ id }, projectJobWhere] },
    include: {
      requester: { select: { fullName: true, email: true } },
      property: { select: { code: true, name: true } },
      unit: { select: { unitNumber: true } }
    }
  });
  if (!j) {
    return null;
  }
  let propertyLabel: string | null = null;
  if (j.property) {
    const u = j.unit?.unitNumber;
    propertyLabel = u ? `${j.property.name} · Unit ${u}` : j.property.name;
  } else if (j.unit) {
    propertyLabel = `Unit ${j.unit.unitNumber}`;
  }
  return {
    id: j.id,
    jobNo: j.jobNo,
    sourceType: j.sourceType,
    title: j.title,
    status: j.status.trim().toLowerCase(),
    scope: j.scope,
    createdAt: j.createdAt.toISOString(),
    scheduledAt: j.scheduledAt?.toISOString() ?? null,
    requesterName: j.requester.fullName,
    requesterEmail: j.requester.email,
    propertyLabel
  };
}
