import { prisma } from "@/lib/prisma";
import { getOperationalLeaseForTenant } from "@/server/queries/leases";

export type CheckoutListRow = {
  id: string;
  leaseId: string;
  tenantUserId: string;
  status: string;
  tenantNotes: string | null;
  preferredMoveOutDate: string | null;
  scheduledAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  inspectionOutcome: string | null;
  damagesSummary: string | null;
  deductionAmount: string | null;
  depositReturnAmount: string | null;
  completedAt: string | null;
};

function normStatus(s: string): string {
  return s.trim().toLowerCase();
}

export async function getOpenCheckoutForLease(leaseId: string) {
  return prisma.leaseCheckOut.findFirst({
    where: {
      leaseId,
      NOT: { status: { in: ["completed", "cancelled"] } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function listRecentCheckoutsForLease(leaseId: string, excludeId?: string, take = 8) {
  const rows = await prisma.leaseCheckOut.findMany({
    where: {
      leaseId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    orderBy: { createdAt: "desc" },
    take
  });
  return rows.map((r) => ({
    id: r.id,
    leaseId: r.leaseId,
    tenantUserId: r.tenantUserId,
    status: normStatus(r.status),
    tenantNotes: r.tenantNotes,
    preferredMoveOutDate: r.preferredMoveOutDate?.toISOString().slice(0, 10) ?? null,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    adminNotes: r.adminNotes,
    createdAt: r.createdAt.toISOString(),
    inspectionOutcome: null,
    damagesSummary: null,
    deductionAmount: null,
    depositReturnAmount: null,
    completedAt: null
  }));
}

export async function getCheckoutById(id: string) {
  return prisma.leaseCheckOut.findUnique({
    where: { id },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { id: true, fullName: true, email: true } }
        }
      }
    }
  });
}

export type CheckoutDetail = CheckoutListRow;

type CheckoutRowScalars = {
  id: string;
  leaseId: string;
  tenantUserId: string;
  status: string;
  tenantNotes: string | null;
  preferredMoveOutDate: Date | null;
  scheduledAt: Date | null;
  adminNotes: string | null;
  inspectionOutcome: string | null;
  damagesSummary: string | null;
  deductionAmount: { toString(): string } | null;
  depositReturnAmount: { toString(): string } | null;
  completedAt: Date | null;
  createdAt: Date;
};

export function toCheckoutDetail(row: CheckoutRowScalars): CheckoutDetail {
  return {
    id: row.id,
    leaseId: row.leaseId,
    tenantUserId: row.tenantUserId,
    status: normStatus(row.status),
    tenantNotes: row.tenantNotes,
    preferredMoveOutDate: row.preferredMoveOutDate?.toISOString().slice(0, 10) ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
    inspectionOutcome: row.inspectionOutcome,
    damagesSummary: row.damagesSummary,
    deductionAmount: row.deductionAmount != null ? row.deductionAmount.toString() : null,
    depositReturnAmount: row.depositReturnAmount != null ? row.depositReturnAmount.toString() : null,
    completedAt: row.completedAt?.toISOString() ?? null
  };
}

export async function canTenantAccessCheckout(userId: string, leaseId: string, tenantUserId: string): Promise<boolean> {
  if (tenantUserId !== userId) {
    return false;
  }
  const lease = await getOperationalLeaseForTenant(userId);
  return lease != null && lease.leaseId === leaseId;
}

export type AdminCheckoutListRow = CheckoutListRow & {
  tenantName: string;
  tenantEmail: string;
  propertyLabel: string | null;
};

export async function listCheckoutsForAdmin(take = 100): Promise<AdminCheckoutListRow[]> {
  const rows = await prisma.leaseCheckOut.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
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
    return {
      id: r.id,
      leaseId: r.leaseId,
      tenantUserId: r.tenantUserId,
      status: normStatus(r.status),
      tenantNotes: r.tenantNotes,
      preferredMoveOutDate: r.preferredMoveOutDate?.toISOString().slice(0, 10) ?? null,
      scheduledAt: r.scheduledAt?.toISOString() ?? null,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      inspectionOutcome: r.inspectionOutcome,
      damagesSummary: r.damagesSummary,
      deductionAmount: r.deductionAmount != null ? r.deductionAmount.toString() : null,
      depositReturnAmount: r.depositReturnAmount != null ? r.depositReturnAmount.toString() : null,
      completedAt: r.completedAt?.toISOString() ?? null,
      tenantName: r.lease.tenant.fullName,
      tenantEmail: r.lease.tenant.email,
      propertyLabel: `${p.name} · Unit ${u.unitNumber}`
    };
  });
}
