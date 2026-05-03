import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export const metadata: Metadata = {
  title: "About · Hestia Real Estate Development",
  description:
    "Hestia Real Estate Development — property management, contracting, and rentals in Doha."
};

/** Narrow reading column — same width for core message + approach. */
const proseCol = "mx-auto w-full max-w-2xl px-4 sm:px-0";

const sectionGap = "py-24 sm:py-28 lg:py-36";

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground">
      {/* SECTION 1 — HERO */}
      <section className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-28 sm:min-h-[78vh] sm:py-32 lg:py-40">
        <div className={`${SITE_SHELL_CLASS} text-center`}>
          <h1 className="mx-auto max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            Building and managing spaces that feel like home
          </h1>
          <div className="mx-auto mt-10 max-w-3xl space-y-6 text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            <p>Hestia Real Estate Development is a property management and contracting company based in Doha.</p>
            <p>
              We specialize in long-term rentals, renovations, and maintenance — combining practical execution with
              thoughtful design to create spaces that are easy to live in and simple to manage.
            </p>
          </div>
          <div className="mt-14">
            <Button asChild size="lg" className="h-12 px-10 text-base font-semibold">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 2 — IMAGE BREAK */}
      <section className="relative h-[min(42vh,28rem)] w-full sm:h-[min(48vh,32rem)] lg:h-[min(52vh,36rem)]">
        <Image
          src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2400&auto=format&fit=crop"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority={false}
        />
      </section>

      {/* SECTION 3 — CORE MESSAGE */}
      <section className={`${sectionGap}`}>
        <div className={proseCol}>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
            A better way to experience property
          </h2>
          <div className="mt-10 space-y-6 text-center text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            <p>At Hestia, we believe a home should do more than function — it should feel right.</p>
            <p>
              Every space we manage or build is designed to be comfortable, well-maintained, and effortless to live in.
            </p>
            <p>
              Because when everything works properly, both tenants and owners experience less stress and more clarity.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — SERVICES */}
      <section className={sectionGap}>
        <div className={`${SITE_SHELL_CLASS}`}>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-12 lg:gap-16">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Property Management</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
                We handle the full lifecycle of a property — from tenant placement to daily operations — with clear
                systems and consistent follow-up.
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Renovations &amp; Fit-Out</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
                We upgrade and transform spaces using practical, modern finishes that improve both living experience and
                long-term value.
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Maintenance</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
                Reliable and structured maintenance that keeps properties running smoothly and prevents issues over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — APPROACH */}
      <section className={sectionGap}>
        <div className={proseCol}>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">Our approach</h2>
          <p className="mt-10 text-center text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            What makes Hestia different is not just the services — it&apos;s how everything is connected.
          </p>
          <p className="mt-6 text-center text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            We operate through a structured system that organizes:
          </p>
          <ul className="mx-auto mt-10 max-w-md space-y-3 text-left text-base text-muted-foreground sm:text-lg">
            <li className="flex gap-3 pl-1">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>leases and contracts</span>
            </li>
            <li className="flex gap-3 pl-1">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>inspections and documentation</span>
            </li>
            <li className="flex gap-3 pl-1">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>maintenance requests</span>
            </li>
            <li className="flex gap-3 pl-1">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>communication between tenants, owners, and team</span>
            </li>
          </ul>
          <p className="mt-10 text-center text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            This creates full visibility, better decisions, and smoother operations.
          </p>
        </div>
      </section>

      {/* SECTION 6 — CLOSING */}
      <section className={`${sectionGap} bg-muted/35`}>
        <div className={proseCol}>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">Our goal</h2>
          <p className="mt-10 text-center text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
            To create and manage spaces that are comfortable, functional, and properly cared for — for both the people who
            live in them and the people who own them.
          </p>
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className="h-12 px-10 text-base font-semibold">
              <Link href="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
