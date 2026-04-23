export const TENANT_REQUEST_KINDS = ["renewal", "transfer", "handover"] as const;
export type TenantRequestKind = (typeof TENANT_REQUEST_KINDS)[number];

export function isTenantRequestKind(value: string): value is TenantRequestKind {
  return (TENANT_REQUEST_KINDS as readonly string[]).includes(value);
}

/** Stored on `jobs.status` for `source_type = tenant_request`. */
export const TENANT_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed",
  "cancelled"
] as const;

export type TenantRequestStatus = (typeof TENANT_REQUEST_STATUSES)[number];

const TERMINAL = new Set<string>(["completed", "rejected", "cancelled"]);

export function isTerminalTenantRequestStatus(status: string): boolean {
  return TERMINAL.has(status.toLowerCase());
}

type Edge = { from: string; to: string; roles: readonly string[] };

const EDGES: Edge[] = [
  { from: "submitted", to: "under_review", roles: ["admin", "super_admin"] },
  { from: "submitted", to: "approved", roles: ["admin", "super_admin"] },
  { from: "submitted", to: "rejected", roles: ["admin", "super_admin"] },
  { from: "submitted", to: "cancelled", roles: ["tenant", "admin", "super_admin"] },

  { from: "under_review", to: "approved", roles: ["admin", "super_admin"] },
  { from: "under_review", to: "rejected", roles: ["admin", "super_admin"] },
  { from: "under_review", to: "completed", roles: ["admin", "super_admin"] },
  { from: "under_review", to: "cancelled", roles: ["admin", "super_admin"] },

  { from: "approved", to: "completed", roles: ["admin", "super_admin"] },
  { from: "approved", to: "cancelled", roles: ["admin", "super_admin", "tenant"] }
];

export function findTenantRequestTransition(
  fromStatus: string,
  toStatus: string,
  actorRoles: readonly string[]
): Edge | null {
  const from = fromStatus.toLowerCase();
  const to = toStatus.toLowerCase();
  return (
    EDGES.find(
      (e) => e.from === from && e.to === to && e.roles.some((r) => actorRoles.includes(r))
    ) ?? null
  );
}

export function listAllowedTenantRequestNextStatuses(
  fromStatus: string,
  actorRoles: readonly string[]
): string[] {
  const from = fromStatus.toLowerCase();
  const next = new Set<string>();
  for (const e of EDGES) {
    if (e.from === from && e.roles.some((r) => actorRoles.includes(r))) {
      next.add(e.to);
    }
  }
  return [...next];
}

export function tenantRequestKindLabel(kind: string | null | undefined): string {
  if (!kind) {
    return "Request";
  }
  switch (kind.toLowerCase()) {
    case "renewal":
      return "Lease renewal";
    case "transfer":
      return "Transfer";
    case "handover":
      return "Handover";
    default:
      return kind;
  }
}

export function tenantRequestStatusLabel(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
