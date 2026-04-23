import { prisma } from "@/lib/prisma";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";

export type CheckInIssueRow = {
  id: string;
  summary: string;
  details: string | null;
  severity: string;
  areaLabel: string | null;
  convertedTicketId: string | null;
  createdAt: string;
};

export type CheckInListRow = {
  id: string;
  leaseId: string;
  tenantUserId: string;
  status: string;
  tenantNotes: string | null;
  adminNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  issueCount: number;
};

export type CheckInDetail = CheckInListRow & {
  issues: CheckInIssueRow[];
};

function normStatus(s: string): string {
  return s.trim().toLowerCase();
}

export async function getOpenCheckInForLease(leaseId: string) {
  return prisma.leaseCheckIn.findFirst({
    where: {
      leaseId,
      NOT: {
        status: { in: ["approved", "rejected", "cancelled"] }
      }
    },
    orderBy: { submittedAt: "desc" },
    include: {
      issues: { orderBy: { createdAt: "asc" } }
    }
  });
}

export async function listRecentCheckInsForLease(leaseId: string, excludeId?: string, take = 8) {
  const rows = await prisma.leaseCheckIn.findMany({
    where: {
      leaseId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    orderBy: { submittedAt: "desc" },
    take,
    include: { _count: { select: { issues: true } } }
  });
  return rows.map((r) => ({
    id: r.id,
    leaseId: r.leaseId,
    tenantUserId: r.tenantUserId,
    status: normStatus(r.status),
    tenantNotes: r.tenantNotes,
    adminNotes: r.adminNotes,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    issueCount: r._count.issues
  }));
}

export async function getCheckInById(id: string) {
  return prisma.leaseCheckIn.findUnique({
    where: { id },
    include: {
      issues: { orderBy: { createdAt: "asc" } },
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { id: true, fullName: true, email: true } }
        }
      }
    }
  });
}

type CheckInRowWithIssues = {
  id: string;
  leaseId: string;
  tenantUserId: string;
  status: string;
  tenantNotes: string | null;
  adminNotes: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  issues: {
    id: string;
    summary: string;
    details: string | null;
    severity: string;
    areaLabel: string | null;
    convertedTicketId: string | null;
    createdAt: Date;
  }[];
};

export function toCheckInDetail(row: CheckInRowWithIssues): CheckInDetail {
  return {
    id: row.id,
    leaseId: row.leaseId,
    tenantUserId: row.tenantUserId,
    status: normStatus(row.status),
    tenantNotes: row.tenantNotes,
    adminNotes: row.adminNotes,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    issueCount: row.issues.length,
    issues: row.issues.map((i) => ({
      id: i.id,
      summary: i.summary,
      details: i.details,
      severity: (i.severity ?? "medium").trim().toLowerCase(),
      areaLabel: i.areaLabel,
      convertedTicketId: i.convertedTicketId,
      createdAt: i.createdAt.toISOString()
    }))
  };
}

export async function canTenantAccessCheckIn(userId: string, leaseId: string, tenantUserId: string): Promise<boolean> {
  if (tenantUserId !== userId) {
    return false;
  }
  const lease = await getOperationalLeaseForTenant(userId);
  return lease != null && lease.leaseId === leaseId;
}

export type AdminCheckInListRow = CheckInListRow & {
  tenantName: string;
  tenantEmail: string;
  propertyLabel: string | null;
};

export async function listCheckInsForAdmin(take = 100): Promise<AdminCheckInListRow[]> {
  const rows = await prisma.leaseCheckIn.findMany({
    orderBy: { submittedAt: "desc" },
    take,
    include: {
      _count: { select: { issues: true } },
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { fullName: true, email: true } }
        }
      }
    }
  });

  return rows.map((r) => {
    const u = r.lease.unit;
    const p = u.property;
    const propertyLabel = `${p.name} · Unit ${u.unitNumber}`;
    return {
      id: r.id,
      leaseId: r.leaseId,
      tenantUserId: r.tenantUserId,
      status: normStatus(r.status),
      tenantNotes: r.tenantNotes,
      adminNotes: r.adminNotes,
      submittedAt: r.submittedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      issueCount: r._count.issues,
      tenantName: r.lease.tenant.fullName,
      tenantEmail: r.lease.tenant.email,
      propertyLabel
    };
  });
}
