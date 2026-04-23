/**
 * Public env consumed by web (and optionally mobile) — never put secrets here.
 * Server-only values stay in the API and infra.
 */
export function getPublicApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:4000";
}
