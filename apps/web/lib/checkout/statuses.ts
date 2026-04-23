export const CHECKOUT_STATUSES = ["requested", "scheduled", "inspected", "completed", "cancelled"] as const;

const TERMINAL = new Set<string>(["completed", "cancelled"]);

export function isTerminalCheckoutStatus(status: string): boolean {
  return TERMINAL.has(status.toLowerCase());
}

type Edge = { from: string; to: string; roles: readonly string[] };

/** Status moves for `updateLeaseCheckoutStatus` only. Scheduling uses `scheduleLeaseCheckout`; inspection → `saveLeaseCheckoutInspection`; close → `completeLeaseCheckout`. */
const EDGES: Edge[] = [
  { from: "requested", to: "cancelled", roles: ["tenant", "admin", "super_admin"] },
  { from: "scheduled", to: "cancelled", roles: ["tenant", "admin", "super_admin"] },
  { from: "inspected", to: "cancelled", roles: ["tenant", "admin", "super_admin"] }
];

export function findCheckoutTransition(
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

export function listAllowedCheckoutNextStatuses(
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

export function checkoutStatusLabel(status: string): string {
  const s = status.toLowerCase();
  const labels: Record<string, string> = {
    requested: "Requested",
    scheduled: "Scheduled",
    inspected: "Inspected",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return labels[s] ?? status;
}
