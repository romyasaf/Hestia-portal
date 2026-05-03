import Link from "next/link";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export default function TermsPage() {
  return (
    <div className="border-b border-border bg-background">
      <div className={`${SITE_SHELL_CLASS} max-w-3xl py-14 sm:py-16 lg:py-20`}>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of Use</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        <div className="mt-10 space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            These terms are a <strong className="text-foreground">placeholder</strong> for Hestia Real Estate
            Development websites and client portals. Replace with counsel-approved terms before marketing at scale.
          </p>
          <p>
            By using this site or portal you agree to follow applicable laws, provide accurate information, and use
            access credentials responsibly. Specific service agreements may supersede general website terms where they
            conflict.
          </p>
          <p>
            For commercial or legal questions, contact{" "}
            <span className="font-mono text-foreground">[email]</span> or{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contact
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
