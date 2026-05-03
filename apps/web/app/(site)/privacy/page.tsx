import Link from "next/link";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export default function PrivacyPage() {
  return (
    <div className="border-b border-border bg-background">
      <div className={`${SITE_SHELL_CLASS} max-w-3xl py-14 sm:py-16 lg:py-20`}>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        <div className="mt-10 space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Hestia Real Estate Development (“Hestia”, “we”) operates this website and the Hestia client portal. This page
            is a <strong className="text-foreground">placeholder</strong> until your legal counsel publishes a final
            policy.
          </p>
          <p>
            In general, we collect only what is needed to provide property management, leasing, maintenance coordination,
            and related services—including account details, property information, communications you send us, and usage
            data required to secure the portal.
          </p>
          <p>
            For questions about data handling, contact{" "}
            <span className="font-mono text-foreground">[email]</span> or visit{" "}
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
