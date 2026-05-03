import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export default function ContactPage() {
  return (
    <div className="border-b border-border bg-background">
      <div className={`${SITE_SHELL_CLASS} py-14 sm:py-16 lg:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Talk with Hestia</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Property management, rentals, or renovation—share context and we&apos;ll respond with clear next steps.
        </p>
        <div className="mt-10 max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-foreground">Direct lines (placeholders)</p>
          <p className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
            <span className="rounded-md border border-dashed border-border px-3 py-2 font-mono text-xs">[email]</span>
            <span className="hidden text-border sm:inline" aria-hidden>
              ·
            </span>
            <span className="rounded-md border border-dashed border-border px-3 py-2 font-mono text-xs">[phone]</span>
          </p>
          <p className="mt-8 text-sm text-muted-foreground">
            Prefer a structured brief? Use our inquiry forms—owners and contractors get routed to the right team.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="font-semibold">
              <Link href="/inquire?inquiryType=owner">Owner / management inquiry</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-semibold">
              <Link href="/inquire?inquiryType=contracting">Renovation inquiry</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
