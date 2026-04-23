import { getAppBaseUrl } from "./app-base-url";

type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Sends password reset email via [Resend](https://resend.com) HTTP API when `RESEND_API_KEY` is set.
 * Without Resend in development, does not log the secret token (use DB row or configure email for testing).
 */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<SendResult> {
  const from = process.env.EMAIL_FROM?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const base = getAppBaseUrl();
  const link = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- dev-only: no token or reset URL in logs
      console.info(
        `[password-reset] (dev) Reset created for ${to}. Set RESEND_API_KEY + EMAIL_FROM to email the link, or read the pending row in password_reset_tokens.`
      );
      return { ok: true };
    }
    return {
      ok: false,
      error: "Email is not configured: set RESEND_API_KEY and EMAIL_FROM for production password reset."
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Hestia Portal password",
      html: `<p>You requested a password reset.</p><p><a href="${link}">Set a new password</a> (expires in 1 hour).</p><p>If you did not request this, you can ignore this email.</p>`
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Resend API error ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}
