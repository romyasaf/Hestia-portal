"use server";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 60;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export type PasswordResetRequestResult = { ok: true } | { ok: false; error: string };
export type PasswordResetCompleteResult = { ok: true } | { ok: false; error: string };

/**
 * Returns ok true when no matching account (anti-enumeration) or when email sent / dev fallback succeeded.
 * Returns ok false on infrastructure failures (DB, missing email config in production).
 */
export async function requestPasswordReset(emailRaw: string): Promise<PasswordResetRequestResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || email.length > 254) {
    return { ok: true };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      select: { id: true, email: true }
    });

    if (!user) {
      return { ok: true };
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = randomBytes(TOKEN_BYTES).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const sent = await sendPasswordResetEmail(user.email, rawToken);
    if (!sent.ok && process.env.NODE_ENV === "production") {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
      return { ok: false, error: sent.error };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "service_unavailable" };
  }
}

export async function completePasswordReset(input: {
  token: string;
  newPassword: string;
}): Promise<PasswordResetCompleteResult> {
  const token = input.token?.trim();
  const newPassword = input.newPassword;
  if (!token || token.length < 32) {
    return { ok: false, error: "invalid_token" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 10) {
    return { ok: false, error: "weak_password" };
  }
  if (newPassword.length > 200) {
    return { ok: false, error: "password_too_long" };
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { id: true, userId: true }
  });

  if (!row) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE users SET password_hash = crypt($1::text, gen_salt('bf')) WHERE id = $2::uuid`,
      newPassword,
      row.userId
    );

    await prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() }
    });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: row.userId, id: { not: row.id } }
    });
  } catch {
    return { ok: false, error: "reset_failed" };
  }

  return { ok: true };
}
