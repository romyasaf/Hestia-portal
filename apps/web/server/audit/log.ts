/**
 * Structured governance audit (stdout JSON). Enable with `AUDIT_LOG=1`.
 * Cross-portal access uses the extended helper in `cross-portal.ts`.
 *
 * Payloads are sanitized before stringify: string caps, control-char stripping, sensitive `meta` keys redacted,
 * and the final line length is capped (see `sanitize.ts`).
 */

import {
  AUDIT_MAX_JSON_STRING_LENGTH,
  sanitizeAuditLogPayload,
  serializeAuditJsonLine
} from "./sanitize";

export type AuditLogPayload = {
  type: string;
  action: string;
  actorUserId: string;
  actorEmail?: string | null;
  recordType?: string;
  recordId?: string;
  /** Full pathname from middleware (e.g. `/tenant/dashboard`). */
  path?: string | null;
  meta?: Record<string, unknown>;
};

export function auditLog(payload: AuditLogPayload): void {
  if (process.env.AUDIT_LOG !== "1") {
    return;
  }
  const record = {
    at: new Date().toISOString(),
    ...sanitizeAuditLogPayload(payload)
  };
  // eslint-disable-next-line no-console -- intentional structured audit when AUDIT_LOG=1
  console.info(serializeAuditJsonLine(record, AUDIT_MAX_JSON_STRING_LENGTH));
}
