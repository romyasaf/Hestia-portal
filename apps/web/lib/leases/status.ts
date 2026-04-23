/** PRD / docs: canonical lowercase lease lifecycle values (DB + writes must use these only). */
export const CANONICAL_LEASE_STATUSES = [
  "draft",
  "active",
  "expired",
  "terminated",
  "renewal_pending"
] as const;

export type CanonicalLeaseStatus = (typeof CANONICAL_LEASE_STATUSES)[number];

const ALLOWED = new Set<string>(CANONICAL_LEASE_STATUSES);

/** Normalize any input to a canonical status; unknown values become `draft` (safe default). */
export function normalizeLeaseStatus(raw: string | null | undefined): CanonicalLeaseStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  return (ALLOWED.has(s) ? s : "draft") as CanonicalLeaseStatus;
}

/** Prisma filter: calendar-active leases (status + dates handled separately at call site). */
export function leaseStatusActiveWhere() {
  return { equals: "active" as const, mode: "insensitive" as const };
}
