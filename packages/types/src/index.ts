/**
 * Hestia Portal — shared domain types (align with API + PRD over time).
 */
/** Role codes stored in `roles.code` and attached to the Auth.js JWT / session. */
export type HestiaRole = "super_admin" | "admin" | "staff" | "tenant" | "owner";

/** API may still return legacy "client" until fully migrated. */
export type AppRole = HestiaRole | "client";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roles: AppRole[];
}

export interface TicketSummary {
  id: string;
  ticketNo: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
}
