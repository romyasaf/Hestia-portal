"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  defaultCallbackUrl: string;
};

export function LoginForm({ defaultCallbackUrl }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const callbackFromQuery = search.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const callbackUrl = callbackFromQuery && callbackFromQuery.startsWith("/") ? callbackFromQuery : defaultCallbackUrl;
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    if (result?.url) {
      router.push(result.url);
      router.refresh();
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid max-w-sm gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Email
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Password
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
