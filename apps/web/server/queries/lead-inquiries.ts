import { prisma } from "@/lib/prisma";
import type { LeadInquiryStatus, LeadInquiryType } from "@/lib/inquiries/constants";

export type LeadInquiryRow = {
  id: string;
  inquiryType: LeadInquiryType;
  status: LeadInquiryStatus;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  context: Record<string, unknown> | null;
  convertedTenantUserId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function asType(v: string): LeadInquiryType {
  if (v === "owner" || v === "tenant" || v === "contracting") {
    return v;
  }
  return "tenant";
}

function asStatus(v: string): LeadInquiryStatus {
  if (v === "new" || v === "in_progress" || v === "closed") {
    return v;
  }
  return "new";
}

export async function listLeadInquiriesForAdmin(filters: {
  type?: LeadInquiryType | "all";
  status?: LeadInquiryStatus | "all";
  take?: number;
}): Promise<LeadInquiryRow[]> {
  const take = Math.min(filters.take ?? 200, 500);
  const where: { inquiryType?: string; status?: string } = {};
  if (filters.type && filters.type !== "all") {
    where.inquiryType = filters.type;
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }

  const rows = await prisma.leadInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take
  });

  return rows.map((r) => ({
    id: r.id,
    inquiryType: asType(r.inquiryType),
    status: asStatus(r.status),
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    message: r.message,
    context: r.context && typeof r.context === "object" && !Array.isArray(r.context) ? (r.context as Record<string, unknown>) : null,
    convertedTenantUserId: r.convertedTenantUserId ?? null,
    convertedAt: r.convertedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  }));
}
