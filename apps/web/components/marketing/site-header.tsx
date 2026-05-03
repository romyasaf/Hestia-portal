import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND_LOGO_FILES, BRAND_LOGO_INTRINSIC } from "@/lib/marketing/brand-assets";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

const navLink =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
  const icon = BRAND_LOGO_FILES.icon;
  const { width: iw, height: ih } = BRAND_LOGO_INTRINSIC.icon;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
      <div className={`${SITE_SHELL_CLASS} flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3.5`}>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 no-underline"
          aria-label="Hestia Real Estate Development — home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-black/10 sm:h-11 sm:w-11">
            <Image
              src={icon}
              alt=""
              width={iw}
              height={ih}
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
              sizes="40px"
              priority
            />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Hestia</span>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-6">
          <nav
            className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 lg:justify-end"
            aria-label="Primary"
          >
            <Link href="/#who-we-serve" className={navLink}>
              Services
            </Link>
            <Link href="/#property-management" className={navLink}>
              Property Management
            </Link>
            <Link href="/#renovations" className={navLink}>
              Renovations
            </Link>
            <Link href="/listings" className={navLink}>
              Listings
            </Link>
            <Link href="/about" className={navLink}>
              About
            </Link>
            <Link href="/contact" className={navLink}>
              Contact
            </Link>
          </nav>
          <Button asChild size="sm" className="h-9 w-full shrink-0 font-semibold sm:w-auto">
            <Link href="/login">Client Portal</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
