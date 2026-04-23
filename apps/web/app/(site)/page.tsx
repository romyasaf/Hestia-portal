import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const stats = [
  {
    value: "99%",
    title: "Occupancy Rate",
    text: "Our managed apartments maintain high tenant satisfaction and renewal rates."
  },
  {
    value: "30+",
    title: "Apartments Under Management",
    text: "From studios to full buildings, each property receives full digital oversight."
  },
  {
    value: "97%",
    title: "On-Time Maintenance",
    text: "Maintenance requests are handled efficiently through our Tenant Portal."
  },
  {
    value: "4+",
    title: "Local Experience",
    text: "Over four years of property management and renovation expertise in Qatar's evolving market."
  }
] as const;

const easeItems = [
  {
    title: "Connected System",
    text: "Manage everything in one place through our online portal."
  },
  {
    title: "Clear & Organized",
    text: "From contracts to maintenance, every stage is scheduled and tracked."
  },
  {
    title: "Transparent Communication",
    text: "Updates, confirmations, and records — all available online."
  },
  {
    title: "Reliable Care",
    text: "A responsive, professional team behind every property and project."
  }
] as const;

const services = [
  {
    title: "Property Management",
    text: "From marketing to move-out inspections. Everything under one roof.",
    cta: "Partner with Hestia",
    href: "/inquire?inquiryType=owner"
  },
  {
    title: "Renovation & Contracting",
    text: "Kitchens, bathrooms, woodwork, and full apartment makeovers.",
    cta: "Start a Project",
    href: "/inquire?inquiryType=contracting"
  },
  {
    title: "Rentals",
    text: "Apartments managed through our smart Tenant Portal for simple, transparent living.",
    cta: "Browse Listings",
    href: "/listings"
  }
] as const;

export default function HestiaLuxuryHomepage() {
  return (
    <div className="flex flex-col">
      {/* Hero — image-led */}
      <section className="relative border-b border-border">
        <div className="grid min-h-[min(85vh,44rem)] md:grid-cols-2">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 sm:py-20 md:py-24 lg:px-12">
            <div className="mx-auto w-full max-w-xl md:mx-0">
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-tight">
                Welcome to Hestia Real Estate Development
              </h1>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                  <Link href="/listings">View Available Apartments</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                  <Link href="/inquire?inquiryType=owner">Partner with Hestia</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="relative min-h-[14rem] md:min-h-0">
            <Image
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop"
              alt="Residential interior"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent md:bg-gradient-to-l" />
          </div>
        </div>
      </section>

      {/* Why Hestia Makes It Easy */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Why Hestia Makes It Easy</h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
          We blend hospitality, smart systems, and hands-on property care to make real estate management simple,
          transparent, and stress-free.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {easeItems.map((item) => (
            <li key={item.title} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Our Services */}
      <section className="border-y border-border bg-muted/25 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Our Services</h2>
          <ul className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {services.map((s) => (
              <li key={s.title} className="flex flex-col rounded-2xl border border-border bg-background p-8 shadow-sm">
                <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{s.text}</p>
                <Button asChild variant="link" className="mt-6 h-auto justify-start p-0 text-base font-semibold">
                  <Link href={s.href}>{s.cta}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stress-Free Property Management */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Stress-Free Property Management</h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {`Own a unit or building in Doha? Hestia manages leasing, contracts, rent collection, and maintenance coordination through one connected online system. You'll enjoy consistent occupancy and full visibility with everything organized in one place.`}
        </p>
        <ul className="mt-8 space-y-3 text-base leading-relaxed text-foreground">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>Leasing &amp; tenant verification</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>Contract drafting &amp; renewals</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>Move-in/out inspections</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>Maintenance tracking via Tenant Portal</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>Monthly reports</span>
          </li>
        </ul>
        <Button asChild size="lg" className="mt-10 h-12 font-semibold">
          <Link href="/inquire?inquiryType=owner">Manage My Property</Link>
        </Button>
      </section>

      {/* Renovation & Fit-Out */}
      <section className="border-y border-border bg-muted/25 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Renovation &amp; Fit-Out That Adds Value</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {`Whether it's a kitchen, wardrobe, or a complete remodel — we turn your ideas into design reality. You'll see the concept before we start and select the quality and budget that fit you best.`}
          </p>
          <ul className="mt-8 space-y-3 text-base leading-relaxed text-foreground">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>Typical timeline 2–6 weeks</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>Personalized design &amp; visualization</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>Fixed-price quotes</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>Warranty on workmanship</span>
            </li>
          </ul>
          <div className="mt-12 rounded-2xl border border-border bg-background p-8 shadow-sm">
            <h3 className="text-lg font-bold tracking-tight">Ready to start your project?</h3>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Get in touch with Hestia Real Estate Development to discuss your property vision.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 font-semibold">
              <Link href="/inquire?inquiryType=contracting">Inquire</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Built on Trust */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Built on Trust, Powered by Results</h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
          At Hestia, we combine technology, care, and experience to deliver measurable results for our clients and
          tenants across Doha.
        </p>
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-wide text-foreground">{s.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Let Us Manage Your Property</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {`Partner with Hestia's Property Management team to maximize your rental income and ensure your property is well cared for. Our experts handle tenant placement, maintenance, and everything in between.`}
        </p>
        <Button asChild size="lg" className="mt-10 h-12 px-10 text-base font-semibold">
          <Link href="/inquire?inquiryType=owner">More info</Link>
        </Button>
      </section>
    </div>
  );
}
