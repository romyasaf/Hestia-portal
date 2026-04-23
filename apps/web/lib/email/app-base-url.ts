/**
 * Canonical public origin for password-reset and marketing links.
 * Prefer `APP_BASE_URL` (e.g. https://portal.example.com); then `NEXTAUTH_URL` or `AUTH_URL` (Auth.js).
 */
export function getAppBaseUrl(): string {
  const explicit =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
