import type { ReactNode } from "react";
import Link from "next/link";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
            <span className="text-foreground">Hestia</span>
            <span className="font-semibold text-muted-foreground"> Portal</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-muted-foreground" aria-label="Marketing">
            <Link href="/" className="transition hover:text-foreground">
              Home
            </Link>
            <Link href="/listings" className="transition hover:text-foreground">
              Listings
            </Link>
            <Link href="/inquire" className="transition hover:text-foreground">
              Inquire
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Hestia Real Estate Development</p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-2">
            <Link href="/dev" className="underline underline-offset-4 hover:text-foreground">
              API dev playground
            </Link>
          </p>
        ) : null}
      </footer>
    </div>
  );
}
