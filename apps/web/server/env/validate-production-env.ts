/**
 * Fails fast on boot in production when critical configuration is missing.
 * Called from `instrumentation.ts` (Node server only, not Edge middleware).
 */
export function validateProductionEnvOrThrow(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing: string[] = [];
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    missing.push("AUTH_SECRET");
  } else if (authSecret.length < 16) {
    throw new Error("[production] AUTH_SECRET must be at least 16 characters.");
  }

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL");
  }

  const publicOrigin =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim();
  if (!publicOrigin) {
    missing.push("APP_BASE_URL, NEXTAUTH_URL, or AUTH_URL (canonical HTTPS origin for links and auth)");
  }

  if (missing.length > 0) {
    throw new Error(`[production] Missing required environment variables: ${missing.join(", ")}`);
  }

  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
  if (!hasResend) {
    // eslint-disable-next-line no-console -- one-line startup warning for ops
    console.warn(
      "[production] RESEND_API_KEY and EMAIL_FROM are not both set — forgot-password email will fail until configured."
    );
  }
}
