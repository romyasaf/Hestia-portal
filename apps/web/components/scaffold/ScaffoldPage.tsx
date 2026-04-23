import Link from "next/link";
import type { ReactNode } from "react";

export type ScaffoldPageMode = "unavailable-in-production" | "stub";

type Props = {
  title: string;
  path: string;
  /** Portal/admin placeholders: hidden copy in production. Marketing/auth: neutral stub in all environments. */
  mode?: ScaffoldPageMode;
  children?: ReactNode;
};

export function ScaffoldPage({ title, path, mode = "unavailable-in-production", children }: Props) {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && mode === "unavailable-in-production") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">This page is not available.</p>
        <p className="mt-6">
          <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    );
  }

  if (mode === "stub") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{path}</code>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Content for this page is not live yet.</p>
        {children}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{path}</code>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        UI scaffold — connect server actions and Prisma in the next implementation phase.
      </p>
      {children}
    </main>
  );
}
