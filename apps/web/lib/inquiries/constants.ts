export const LEAD_INQUIRY_TYPES = ["owner", "tenant", "contracting"] as const;
export type LeadInquiryType = (typeof LEAD_INQUIRY_TYPES)[number];

export const LEAD_INQUIRY_STATUSES = ["new", "in_progress", "closed"] as const;
export type LeadInquiryStatus = (typeof LEAD_INQUIRY_STATUSES)[number];

export function isLeadInquiryType(v: string): v is LeadInquiryType {
  return (LEAD_INQUIRY_TYPES as readonly string[]).includes(v);
}

export function isLeadInquiryStatus(v: string): v is LeadInquiryStatus {
  return (LEAD_INQUIRY_STATUSES as readonly string[]).includes(v);
}

/** Admin lists, emails, and form context — full phrase. */
export function leadInquiryTypeLabel(t: LeadInquiryType): string {
  switch (t) {
    case "owner":
      return "Property owner";
    case "tenant":
      return "Tenant";
    case "contracting":
      return "Contracting / renovation";
    default:
      return t;
  }
}

/** Compact labels for in-page navigation (tabs). */
export function leadInquiryTypeNavLabel(t: LeadInquiryType): string {
  switch (t) {
    case "owner":
      return "Owners";
    case "tenant":
      return "Renters";
    case "contracting":
      return "Contracting";
    default:
      return t;
  }
}

/** Public `/inquire` URL: prefer `inquiryType`, accept legacy `type`. */
export function parseLeadInquiryTypeFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): LeadInquiryType | null {
  const rawParam = searchParams.inquiryType ?? searchParams.type;
  const raw = typeof rawParam === "string" ? rawParam.trim() : "";
  if (!raw) {
    return null;
  }
  return isLeadInquiryType(raw) ? raw : null;
}
