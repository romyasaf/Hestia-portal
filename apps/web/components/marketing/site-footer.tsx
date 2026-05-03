import Link from "next/link";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-surface-border bg-brand-surface text-brand-surface-muted">
      <div className={`${SITE_SHELL_CLASS} py-12 sm:py-16`}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-lg space-y-5">
            <BrandLogo href="/" variant="onDark" layout="footer" />
            <p className="text-sm leading-relaxed text-brand-surface-foreground/90">
              <span className="font-semibold text-brand-surface-foreground">Hestia Real Estate Development</span>
              <span className="mx-2 text-brand-surface-border" aria-hidden>
                |
              </span>
              <span>Property Management · Rentals · Renovation</span>
              <span className="mx-2 text-brand-surface-border" aria-hidden>
                |
              </span>
              <span>Doha, Qatar</span>
              <span className="mx-2 text-brand-surface-border" aria-hidden>
                |
              </span>
              <a href="mailto:info@hestia.com.qa" className="text-brand-surface-foreground/95 hover:text-brand-cyan">
                info@hestia.com.qa
              </a>
              <span className="mx-2 text-brand-surface-border" aria-hidden>
                |
              </span>
              <a href="tel:+97455447089" className="text-brand-surface-foreground/95 hover:text-brand-cyan">
                +974 55447089
              </a>
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-surface-muted lg:justify-end"
            aria-label="Footer"
          >
            <Link href="/about" className="transition-colors hover:text-brand-cyan">
              About
            </Link>
            <Link href="/portfolio" className="transition-colors hover:text-brand-cyan">
              Portfolio
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-brand-cyan">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-brand-cyan">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-brand-cyan">
              Contact
            </Link>
          </nav>
        </div>
        <p className="mt-10 border-t border-white/10 pt-8 text-xs text-brand-surface-muted/75">
          © {new Date().getFullYear()} Hestia Real Estate Development.
        </p>
      </div>
    </footer>
  );
}
