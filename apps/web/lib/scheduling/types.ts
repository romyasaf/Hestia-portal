/** Workflows that expose a single primary appointment / visit timestamp in the DB. */
export type WorkflowAppointmentKind = "maintenance" | "checkout_inspection" | "tenant_request";

export type WorkflowAppointment = {
  kind: WorkflowAppointmentKind;
  recordId: string;
  /** When null, nothing is scheduled yet. */
  at: Date | null;
};
