export const CHECK_IN_STATUSES = ["submitted", "under_review", "approved", "rejected", "cancelled"] as const;

const TERMINAL = new Set<string>(["approved", "rejected", "cancelled"]);

export function isTerminalCheckInStatus(status: string): boolean {
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
  { from: "under_review", to: "cancelled", roles: ["admin", "super_admin"] }
];

export function findCheckInTransition(
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

export function listAllowedCheckInNextStatuses(
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

export function checkInStatusLabel(status: string): string {
  const s = status.toLowerCase();
  const labels: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled"
  };
  return labels[s] ?? status;
}
