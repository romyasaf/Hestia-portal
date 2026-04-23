"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { completePasswordReset } from "@/server/actions/password-reset";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 10) {
      setMessage("Use at least 10 characters.");
      return;
    }
    if (!token) {
      setMessage("Missing reset token. Open the link from your email.");
      return;
    }
    startTransition(async () => {
      const res = await completePasswordReset({ token, newPassword: password });
      if (!res.ok) {
        if (res.error === "invalid_or_expired_token") {
          setMessage("This link is invalid or has expired. Request a new reset from the login page.");
        } else if (res.error === "reset_failed") {
          setMessage("Could not update your password. Try again or contact support.");
        } else {
          setMessage("Could not reset password. Try again.");
        }
        return;
      }
      router.replace("/login?reset=ok");
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a strong password you have not used elsewhere.</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="rp-pw">
            New password
          </label>
          <input
            id="rp-pw"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="rp-pw2">
            Confirm password
          </label>
          <input
            id="rp-pw2"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
