export const TENANT_TYPES = ["individual", "company"] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const TENANT_LIFECYCLE_STATUSES = ["active", "previous", "lead_pending"] as const;
export type TenantLifecycleStatus = (typeof TENANT_LIFECYCLE_STATUSES)[number];

export function normalizeTenantType(raw: string | null | undefined): TenantType {
  const s = (raw ?? "individual").trim().toLowerCase();
  return s === "company" ? "company" : "individual";
}

export function normalizeTenantLifecycleStatus(raw: string | null | undefined): TenantLifecycleStatus {
  const s = (raw ?? "active").trim().toLowerCase();
  if (s === "previous") return "previous";
  if (s === "lead_pending") return "lead_pending";
  return "active";
}

export function tenantTypeLabel(t: TenantType): string {
  return t === "company" ? "Company" : "Individual";
}
