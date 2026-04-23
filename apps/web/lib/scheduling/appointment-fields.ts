import type { WorkflowAppointment, WorkflowAppointmentKind } from "@/lib/scheduling/types";

/** Read normalized appointment from persisted row shapes (no DB call). */
export function appointmentFromMaintenanceTicket(row: { id: string; appointmentAt: Date | null }): WorkflowAppointment {
  return { kind: "maintenance", recordId: row.id, at: row.appointmentAt };
}

export function appointmentFromCheckout(row: { id: string; scheduledAt: Date | null }): WorkflowAppointment {
  return { kind: "checkout_inspection", recordId: row.id, at: row.scheduledAt };
}

export function appointmentFromTenantRequestJob(row: { id: string; scheduledAt: Date | null }): WorkflowAppointment {
  return { kind: "tenant_request", recordId: row.id, at: row.scheduledAt };
}

/** Maintenance: moving away from `Scheduled` should clear the slot to avoid stale calendar data. */
export function maintenanceShouldClearAppointment(
  fromStatus: string,
  toStatus: string
): boolean {
  if (fromStatus !== "Scheduled") {
    return false;
  }
  return toStatus !== "Scheduled";
}

/**
 * True when `lease_checkouts.scheduled_at` should be set to null after this transition.
 * - Terminal outcomes `cancelled` / `completed`: always clear (e.g. inspected → completed still holds the old visit time).
 * - `scheduled` → `requested`: admin cancelled the inspection slot without terminalizing the checkout.
 */
export function checkoutShouldClearScheduledAt(fromStatus: string, toStatus: string): boolean {
  const f = fromStatus.toLowerCase();
  const t = toStatus.toLowerCase();
  if (t === "cancelled" || t === "completed") {
    return true;
  }
  if (f === "scheduled" && t === "requested") {
    return true;
  }
  return false;
}

export function labelForAppointmentKind(kind: WorkflowAppointmentKind): string {
  switch (kind) {
    case "maintenance":
      return "Maintenance visit";
    case "checkout_inspection":
      return "Checkout inspection";
    case "tenant_request":
      return "Request meeting";
    default:
      return "Appointment";
  }
}
