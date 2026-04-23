/**
 * Optional audit trail when admin/super_admin session hits tenant/staff/owner layouts.
 * Enable with AUDIT_CROSS_PORTAL=1 in the server environment (structured JSON to stdout).
 *
 * For a future impersonation feature: log `x-impersonation-context` from the request when
 * `IMPERSONATION_AUDIT=1` — this module does not switch users; it only records opaque context.
 * Values are truncated and control-stripped in `sanitize.ts` (bounded line length, no raw megabyte headers).
 */

import {
  AUDIT_MAX_JSON_STRING_LENGTH,
  sanitizeCrossPortalRecord,
  serializeAuditJsonLine
} from "./sanitize";

export type CrossPortalPayload = {
  userId: string;
  email: string | null | undefined;
  roles: string[];
  portal: "tenant" | "staff" | "owner";
  /** Logical portal prefix (fallback when pathname missing). */
  path: string;
  /** Actual pathname from middleware (`x-pathname`). */
  requestPath?: string | null;
  action?: string;
  recordId?: string | null;
  impersonationContext?: string | null;
};

export function auditCrossPortalAccess(payload: CrossPortalPayload): void {
  if (process.env.AUDIT_CROSS_PORTAL !== "1") {
    return;
  }
  const privileged = payload.roles.some((r) => r === "admin" || r === "super_admin");
  if (!privileged) {
    return;
  }

  const record = {
    type: "cross_portal_access",
    at: new Date().toISOString(),
    ...sanitizeCrossPortalRecord(payload)
  };
  // eslint-disable-next-line no-console -- intentional structured audit when AUDIT_CROSS_PORTAL=1
  console.info(serializeAuditJsonLine(record, AUDIT_MAX_JSON_STRING_LENGTH));
}
