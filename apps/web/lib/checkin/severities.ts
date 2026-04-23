const SEVERITIES = new Set(["cosmetic", "low", "medium", "high", "safety"]);

export function normalizeCheckInSeverity(raw?: string | null): string {
  const v = (raw ?? "medium").trim().toLowerCase();
  return SEVERITIES.has(v) ? v : "medium";
}

export const CHECKIN_SEVERITY_OPTIONS = ["cosmetic", "low", "medium", "high", "safety"] as const;
