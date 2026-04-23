/**
 * Shared limits for stdout JSON audit lines — prevents oversized / unsafe payloads.
 * (No secrets in logs: truncate strings, strip control characters, redact sensitive meta keys.)
 */

/** Max UTF-16 code units for generic scalar strings in `meta`. */
export const AUDIT_META_STRING_MAX = 512;
/** Max depth when walking `meta` objects (plain objects only; arrays count as depth). */
export const AUDIT_META_MAX_DEPTH = 5;
/** Max keys processed per object level in `meta`. */
export const AUDIT_META_MAX_KEYS = 40;
/** Max elements serialized from an array inside `meta`. */
export const AUDIT_META_MAX_ARRAY = 30;
/** Max length for pathname / portal path fields. */
export const AUDIT_MAX_PATH_STRING = 2048;
/** Max length for `x-impersonation-context` and similar opaque correlation blobs. */
export const AUDIT_MAX_IMPERSONATION_CONTEXT = 256;
/** Max length for one complete audit JSON line (UTF-16 code units). */
export const AUDIT_MAX_JSON_STRING_LENGTH = 16_384;
/** If sanitized `meta` serializes larger than this, replace it with a placeholder (defense in depth). */
const AUDIT_META_JSON_BUDGET = 6144;

const SENSITIVE_KEY = new RegExp(
  String.raw`(?:password|passwd|pwd|secret|token|authorization|cookie|set-cookie|ssn|socialSecurity|` +
    String.raw`creditCard|cardNumber|cardCvv|cvc|cvv|apikey|api_key|bearer|refresh|privateKey|accessKey)`,
  "i"
);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Removes C0/C1 controls (avoids log injection and NUL surprises); truncates to `max` code units. */
export function stripControlCharsAndTruncate(s: string, max: number): string {
  const cleaned = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max);
}

/** Safe nullable string for audit headers / correlation ids. */
export function sanitizeImpersonationContext(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const t = raw.trim();
  if (!t) {
    return null;
  }
  return stripControlCharsAndTruncate(t, AUDIT_MAX_IMPERSONATION_CONTEXT);
}

function sanitizeMetaValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > AUDIT_META_MAX_DEPTH) {
    return "[max_depth]";
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && (!Number.isFinite(value) || Number.isNaN(value))) {
      return null;
    }
    return value;
  }
  if (typeof value === "bigint") {
    return stripControlCharsAndTruncate(String(value), 64);
  }
  if (typeof value === "string") {
    return stripControlCharsAndTruncate(value, AUDIT_META_STRING_MAX);
  }
  if (typeof value === "undefined") {
    return null;
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return "[omitted]";
  }
  if (Array.isArray(value)) {
    const slice = value.slice(0, AUDIT_META_MAX_ARRAY);
    return slice.map((v) => sanitizeMetaValue(v, depth + 1, seen));
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value);
    let n = 0;
    for (const k of keys) {
      if (n >= AUDIT_META_MAX_KEYS) {
        out._auditMetaTruncatedKeys = true;
        break;
      }
      const safeKey = stripControlCharsAndTruncate(k, 128);
      if (SENSITIVE_KEY.test(safeKey)) {
        out[safeKey] = "[REDACTED]";
      } else {
        out[safeKey] = sanitizeMetaValue(value[k], depth + 1, seen);
      }
      n += 1;
    }
    return out;
  }
  return "[omitted_non_plain_object]";
}

/** Returns a JSON-safe meta object or `undefined` if empty after sanitization. */
export function sanitizeAuditMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (meta == null || typeof meta !== "object") {
    return undefined;
  }
  const seen = new WeakSet<object>();
  const sanitized = sanitizeMetaValue(meta, 0, seen);
  if (!isPlainObject(sanitized)) {
    return undefined;
  }
  return Object.keys(sanitized).length ? sanitized : undefined;
}

export type SanitizedAuditLogFields = {
  type: string;
  action: string;
  actorUserId: string;
  actorEmail?: string | null;
  recordType?: string;
  recordId?: string;
  path?: string | null;
  meta?: Record<string, unknown>;
};

export function sanitizeAuditLogPayload(input: {
  type: string;
  action: string;
  actorUserId: string;
  actorEmail?: string | null;
  recordType?: string;
  recordId?: string;
  path?: string | null;
  meta?: Record<string, unknown>;
}): SanitizedAuditLogFields {
  const out: SanitizedAuditLogFields = {
    type: stripControlCharsAndTruncate(String(input.type), 64),
    action: stripControlCharsAndTruncate(String(input.action), 128),
    actorUserId: stripControlCharsAndTruncate(String(input.actorUserId), 128)
  };
  if (input.actorEmail != null) {
    out.actorEmail = stripControlCharsAndTruncate(String(input.actorEmail), 254);
  }
  if (input.recordType != null) {
    out.recordType = stripControlCharsAndTruncate(String(input.recordType), 64);
  }
  if (input.recordId != null) {
    out.recordId = stripControlCharsAndTruncate(String(input.recordId), 128);
  }
  if (input.path != null) {
    out.path = stripControlCharsAndTruncate(String(input.path), AUDIT_MAX_PATH_STRING);
  }
  let meta = sanitizeAuditMeta(input.meta);
  if (meta != null) {
    try {
      if (JSON.stringify(meta).length > AUDIT_META_JSON_BUDGET) {
        meta = { _auditOmitted: true, reason: "meta_json_budget" };
      }
    } catch {
      meta = { _auditOmitted: true, reason: "meta_not_serializable" };
    }
    out.meta = meta;
  }
  return out;
}

/** Ensures a single stdout line stays within `maxLen` by shrinking or dropping `meta`. */
export function serializeAuditJsonLine(record: Record<string, unknown>, maxLen: number): string {
  let json = JSON.stringify(record);
  if (json.length <= maxLen) {
    return json;
  }
  const { meta, ...rest } = record;
  if (meta !== undefined) {
    json = JSON.stringify({
      ...rest,
      meta: { _auditOmitted: true, reason: "line_length_cap" }
    });
    if (json.length <= maxLen) {
      return json;
    }
  }
  return JSON.stringify({
    type: rest.type,
    at: rest.at,
    action: rest.action ?? null,
    actorUserId: rest.actorUserId ?? null,
    _auditOmitted: true,
    reason: "line_length_cap_hard"
  });
}

const AUDIT_ROLE_MAX = 64;
const AUDIT_ROLES_MAX = 24;

/** Same shape as `CrossPortalPayload` in `cross-portal.ts` (kept separate to avoid circular imports). */
export type CrossPortalAuditInput = {
  userId: string;
  email: string | null | undefined;
  roles: string[];
  portal: "tenant" | "staff" | "owner";
  path: string;
  requestPath?: string | null;
  action?: string;
  recordId?: string | null;
  impersonationContext?: string | null;
};

/** Builds a JSON-serializable cross-portal record with bounded, non-sensitive string fields. */
export function sanitizeCrossPortalRecord(payload: CrossPortalAuditInput): Record<string, unknown> {
  const roles = (payload.roles ?? [])
    .slice(0, AUDIT_ROLES_MAX)
    .map((r) => stripControlCharsAndTruncate(String(r), AUDIT_ROLE_MAX));
  const out: Record<string, unknown> = {
    portal: payload.portal,
    path: stripControlCharsAndTruncate(String(payload.path), AUDIT_MAX_PATH_STRING),
    requestPath: stripControlCharsAndTruncate(
      String(payload.requestPath ?? payload.path),
      AUDIT_MAX_PATH_STRING
    ),
    action: stripControlCharsAndTruncate(String(payload.action ?? "layout_render"), 128),
    recordId: payload.recordId != null ? stripControlCharsAndTruncate(String(payload.recordId), 128) : null,
    userId: stripControlCharsAndTruncate(String(payload.userId), 128),
    email: payload.email != null ? stripControlCharsAndTruncate(String(payload.email), 254) : null,
    roles
  };
  if (process.env.IMPERSONATION_AUDIT === "1") {
    out.impersonationContext = sanitizeImpersonationContext(payload.impersonationContext);
  }
  return out;
}
