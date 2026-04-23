/** PRD maintenance statuses (exact labels). */
export const MAINTENANCE_STATUSES = [
  "Pending Review",
  "Assigned to Staff",
  "Awaiting Admin Review",
  "Awaiting Tenant Approval",
  "Approved",
  "Awaiting Scheduling",
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rejected"
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

const TERMINAL = new Set<string>(["Completed", "Cancelled", "Rejected"]);

export function isTerminalMaintenanceStatus(status: string): boolean {
  return TERMINAL.has(status);
}

type Edge = { from: string; to: string; roles: readonly string[] };

/**
 * Allowed status transitions. Roles: tenant, staff, admin, super_admin.
 * Extra checks (assignee, ticket owner) happen in server actions.
 */
const EDGES: Edge[] = [
  { from: "Pending Review", to: "Assigned to Staff", roles: ["admin", "super_admin"] },
  { from: "Pending Review", to: "Rejected", roles: ["admin", "super_admin"] },
  { from: "Pending Review", to: "Cancelled", roles: ["admin", "super_admin", "tenant"] },

  { from: "Assigned to Staff", to: "Awaiting Admin Review", roles: ["staff", "admin", "super_admin"] },
  /** Staff must submit a quote before admin review; direct “In Progress” only for ops override. */
  { from: "Assigned to Staff", to: "In Progress", roles: ["admin", "super_admin"] },
  { from: "Assigned to Staff", to: "Cancelled", roles: ["admin", "super_admin", "staff"] },

  { from: "Awaiting Admin Review", to: "Awaiting Tenant Approval", roles: ["admin", "super_admin"] },
  { from: "Awaiting Admin Review", to: "Approved", roles: ["admin", "super_admin"] },
  { from: "Awaiting Admin Review", to: "Cancelled", roles: ["admin", "super_admin"] },

  { from: "Awaiting Tenant Approval", to: "Approved", roles: ["tenant", "admin", "super_admin"] },
  { from: "Awaiting Tenant Approval", to: "Rejected", roles: ["tenant", "admin", "super_admin"] },
  { from: "Awaiting Tenant Approval", to: "Cancelled", roles: ["admin", "super_admin", "tenant"] },

  { from: "Approved", to: "Awaiting Scheduling", roles: ["admin", "super_admin", "tenant"] },
  { from: "Approved", to: "Cancelled", roles: ["admin", "super_admin", "tenant"] },

  { from: "Awaiting Scheduling", to: "Scheduled", roles: ["admin", "super_admin", "tenant"] },
  { from: "Awaiting Scheduling", to: "Cancelled", roles: ["admin", "super_admin", "tenant"] },

  { from: "Scheduled", to: "In Progress", roles: ["staff", "admin", "super_admin"] },
  { from: "Scheduled", to: "Cancelled", roles: ["admin", "super_admin", "staff"] },

  { from: "In Progress", to: "Completed", roles: ["staff", "admin", "super_admin"] },
  { from: "In Progress", to: "Cancelled", roles: ["admin", "super_admin", "staff"] }
];

export function findTransitionEdge(
  fromStatus: string,
  toStatus: string,
  actorRoles: readonly string[]
): Edge | null {
  return (
    EDGES.find(
      (e) =>
        e.from === fromStatus &&
        e.to === toStatus &&
        e.roles.some((r) => actorRoles.includes(r))
    ) ?? null
  );
}

export function listAllowedNextStatuses(fromStatus: string, actorRoles: readonly string[]): string[] {
  const next = new Set<string>();
  for (const e of EDGES) {
    if (e.from === fromStatus && e.roles.some((r) => actorRoles.includes(r))) {
      next.add(e.to);
    }
  }
  return [...next];
}
