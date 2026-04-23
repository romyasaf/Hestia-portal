"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultPortalForRoles } from "@/lib/rbac/portal-guards";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** Only when middleware sent the user here (e.g. deep link to a portal). */
  const explicitCallback = searchParams.get("callbackUrl");
  const signInCallbackUrl =
    explicitCallback && explicitCallback.startsWith("/") ? explicitCallback : "/";
  const error = searchParams.get("error");
  const resetOk = searchParams.get("reset") === "ok";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: signInCallbackUrl
    });

    setLoading(false);

    if (result?.error) {
      setMessage("Invalid email or password.");
      return;
    }

    await router.refresh();

    let dest: string;
    if (explicitCallback && explicitCallback.startsWith("/")) {
      dest = explicitCallback;
    } else {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await res.json()) as { user?: { roles?: string[] } } | null;
      const roles = Array.isArray(session?.user?.roles) ? session.user.roles : [];
      dest = defaultPortalForRoles(roles);
    }

    if (explicitCallback && explicitCallback.startsWith("/")) {
      router.replace(result?.url ?? explicitCallback);
    } else {
      router.replace(dest);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hestia Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One sign-in for every account. Your administrator creates your user, sets your roles, and then you sign in
          here — we send you to admin, staff, owner, or tenant based on those permissions.
        </p>
      </div>
      {resetOk ? (
        <p className="text-sm font-medium text-green-700 dark:text-green-400">Password updated — you can sign in.</p>
      ) : null}
      {error === "access" ? (
        <p className="text-sm font-medium text-destructive">You do not have access to that area.</p>
      ) : null}
      {error === "config" ? (
        <p className="text-sm font-medium text-destructive">
          Server misconfiguration: <code className="font-mono">AUTH_SECRET</code> is missing. Set it in{" "}
          <code className="font-mono">.env.local</code>.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}
