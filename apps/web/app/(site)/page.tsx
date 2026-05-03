import {
  Building2,
  ClipboardCheck,
  FileStack,
  Hammer,
  Home,
  LayoutDashboard,
  PenLine,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

const shell = SITE_SHELL_CLASS;
const sectionY = "py-20 sm:py-24 lg:py-28";
const altBg = "bg-muted/[0.22]";

const trustCards = [
  { title: "Doha-based team", detail: "Local decisions, same time zone." },
  { title: "30+ units managed", detail: "Same standards across the portfolio." },
  { title: "Renovation + maintenance in-house", detail: "Design, build, and upkeep aligned." },
  { title: "Full digital tracking system", detail: "Paper trails where you need them." }
] as const;

const whoWeServe = [
  {
    title: "Owners",
    promise: "Stable occupancy + documented operations.",
    Icon: Building2
  },
  {
    title: "Tenants",
    promise: "Clean living + responsive care.",
    Icon: Home
  },
  {
    title: "Projects",
    promise: "Renovations that increase asset value.",
    Icon: Hammer
  }
] as const;

const pmBullets = [
  "Tenant placement & marketing",
  "Contracts & renewals",
  "Inspections & documentation",
  "Rent collection",
  "Maintenance coordination",
  "Monthly reporting"
] as const;

const systemMicro = [
  { title: "Work orders tracked end-to-end", Icon: ClipboardCheck },
  { title: "Inspection photos stored", Icon: FileStack },
  { title: "Costs + invoices uploaded", Icon: PenLine }
] as const;

const steps = [
  { title: "Evaluation", text: "We walk the property, note condition, and align on rent positioning." },
  { title: "Setup", text: "Listings, agreements, and your dashboard go live — nothing left vague." },
  { title: "Management", text: "Tenants, suppliers, and inspections run through one operating rhythm." },
  { title: "Reporting", text: "You see what happened, what it cost, and what comes next." }
] as const;

const renovationServices = [
  "Full renovations & fit-outs",
  "Kitchens & wardrobes",
  "Bathrooms & waterproofing",
  "Flooring & finishes",
  "Electrical & lighting"
] as const;

const processSteps = ["Consultation", "Design & Quotation", "Execution", "Handover & Warranty"] as const;

const stats = [
  { value: "98%", label: "Occupancy", proof: "Renewals and retention — not churn for its own sake." },
  { value: "24–48h", label: "Maintenance response", proof: "Requests triaged the day they land in the system." },
  { value: "30+", label: "Units under management", proof: "Same cadence of oversight, whether one unit or many." },
  { value: "4+", label: "Years in Doha", proof: "Local crews, local norms, and a long memory for what works." }
] as const;

const work = [
  {
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=900&auto=format&fit=crop",
    line: "West Bay — 2BR",
    out: "Leased after refresh; maintenance and inspections on a fixed rhythm."
  },
  {
    img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=900&auto=format&fit=crop",
    line: "The Pearl — full fit-out",
    out: "Scope-locked renovation, then handover with warranty pack and photos."
  },
  {
    img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=900&auto=format&fit=crop",
    line: "Lusail — building ops",
    out: "One coordinator for suppliers, owners, and recurring compliance checks."
  },
  {
    img: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=900&auto=format&fit=crop",
    line: "Al Sadd — studio",
    out: "Fast turnaround between tenants; every handover photographed."
  },
  {
    img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=900&auto=format&fit=crop",
    line: "West Bay — kitchen & bath",
    out: "Waterproofing first, then finishes — built to survive real daily use."
  },
  {
    img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=900&auto=format&fit=crop",
    line: "Doha — landlord refresh",
    out: "Cosmetic upgrade that lifted rent without overcapitalising."
  }
] as const;

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      {/* HERO */}
      <section className="border-b border-border/50">
        <div className={`${shell} ${sectionY}`}>
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <h1 className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.5rem] lg:leading-[1.08]">
                More Than Property Management.
                <span className="mt-2 block sm:mt-3">We Take Care of What You Own.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-snug text-muted-foreground sm:text-lg">
                We manage, maintain, and transform properties across Doha — hands-on care, structured systems, and
                full visibility so your asset performs and people feel at home.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-sm">
                  <Link href="/inquire?inquiryType=owner">Manage My Property</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 border-foreground/15 px-8 text-base font-semibold">
                  <Link href="/listings">Browse Apartments</Link>
                </Button>
              </div>
              <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-4">
                {trustCards.map((c) => (
                  <div
                    key={c.title}
                    className="rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm ring-1 ring-black/[0.02] transition hover:border-primary/25 hover:shadow-md"
                  >
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative lg:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)] ring-1 ring-border/40 lg:aspect-[5/4]">
                <Image
                  src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2000&auto=format&fit=crop"
                  alt="Residential interior in Doha"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/20" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section id="who-we-serve" className={`scroll-mt-24 ${sectionY} ${altBg}`}>
        <div className={shell}>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for real owners (and real tenants)
          </h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-3 lg:mt-14 lg:gap-8">
            {whoWeServe.map(({ title, promise, Icon }) => (
              <li
                key={title}
                className="flex flex-col rounded-2xl border border-border/50 bg-background p-7 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-14px_rgba(0,0,0,0.12)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{promise}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROPERTY MANAGEMENT */}
      <section id="property-management" className={`scroll-mt-24 ${sectionY}`}>
        <div className={shell}>
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Property Management, Structured End-to-End
          </h2>
          <div className="mt-12 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:items-start lg:gap-10">
            <div className="lg:col-span-7">
              <ul className="space-y-3 text-base text-muted-foreground">
                {pmBullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-10" size="lg">
                <Link href="/inquire?inquiryType=owner">Manage My Property</Link>
              </Button>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/30 to-background p-6 shadow-inner ring-1 ring-black/[0.03]">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden />
                    Owner dashboard
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Live</span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-2 w-full max-w-[85%] rounded-full bg-primary/20" />
                  <div className="h-2 w-full max-w-[65%] rounded-full bg-muted-foreground/15" />
                  <div className="h-2 w-full max-w-[72%] rounded-full bg-muted-foreground/12" />
                  <div className="grid grid-cols-3 gap-2 pt-4">
                    <div className="aspect-[4/3] rounded-lg bg-primary/10" />
                    <div className="aspect-[4/3] rounded-lg bg-muted-foreground/10" />
                    <div className="aspect-[4/3] rounded-lg bg-muted-foreground/10" />
                  </div>
                </div>
                <p className="mt-6 text-center text-sm font-medium text-foreground">Everything tracked, nothing lost.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE SYSTEM */}
      <section id="the-system" className={`scroll-mt-24 ${sectionY} ${altBg}`}>
        <div className={shell}>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-8">
              <h2 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl lg:text-[2rem] lg:leading-tight">
                Your property stays under control because the system never sleeps.
              </h2>
              <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Tenants submit requests. Suppliers receive work orders. Owners see what matters.
              </p>
            </div>
            <div className="lg:col-span-4 lg:flex lg:justify-end">
              <Button asChild variant="outline" size="lg" className="w-full border-foreground/15 font-semibold lg:w-auto">
                <Link href="/#steps">See how it works</Link>
              </Button>
            </div>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-3 lg:mt-14">
            {systemMicro.map(({ title, Icon }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-xl border border-border/50 bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-sm font-medium leading-snug text-foreground sm:text-[0.9375rem]">{title}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STEPS */}
      <section id="steps" className={`scroll-mt-24 ${sectionY}`}>
        <div className={shell}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it runs</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative pl-1">
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RENOVATIONS */}
      <section id="renovations" className={`scroll-mt-24 ${sectionY} ${altBg}`}>
        <div className={shell}>
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Renovations that make your asset stronger—and more rentable.
          </h2>
          <div className="mt-12 grid gap-12 lg:mt-14 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">What we take on</p>
              <ul className="mt-5 space-y-3 text-base text-muted-foreground">
                {renovationServices.map((s) => (
                  <li key={s} className="flex gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">How we move</p>
              <ol className="mt-5 space-y-4">
                {processSteps.map((p, i) => (
                  <li key={p} className="flex gap-4 text-sm sm:text-base">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-medium text-foreground">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4">
            <figure className="group relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-border/50">
              <Image
                src="https://images.unsplash.com/photo-1600585152911-dbcbecd0e9a8?q=80&w=800&auto=format&fit=crop"
                alt="Before renovation"
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-background/85 px-3 py-2 text-center text-xs font-semibold backdrop-blur-sm">
                Before
              </figcaption>
            </figure>
            <figure className="group relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-border/50">
              <Image
                src="https://images.unsplash.com/photo-1600566753080-013f5e8e9e7a?q=80&w=800&auto=format&fit=crop"
                alt="After renovation"
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-background/85 px-3 py-2 text-center text-xs font-semibold backdrop-blur-sm">
                After
              </figcaption>
            </figure>
          </div>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/inquire?inquiryType=contracting">Start a Project</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section id="numbers" className={`scroll-mt-24 ${sectionY}`}>
        <div className={shell}>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Consistency is the product.</h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-8">
            {stats.map((s) => (
              <li
                key={s.label}
                className="rounded-2xl border border-border/50 bg-card/80 p-6 text-center shadow-sm transition hover:border-primary/25 hover:shadow-md"
              >
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-4 text-left text-xs leading-relaxed text-muted-foreground sm:text-center sm:text-sm">{s.proof}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SELECTED WORK */}
      <section id="selected-work" className={`scroll-mt-24 ${sectionY} ${altBg}`}>
        <div className={shell}>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Selected Work</h2>
              <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
                A look at management + renovations + maintenance.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full shrink-0 border-foreground/15 font-semibold sm:w-auto" size="lg">
              <Link href="/portfolio">View case studies</Link>
            </Button>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {work.map((w) => (
              <li
                key={w.line}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link href="/portfolio" className="relative aspect-[16/11] block overflow-hidden">
                  <Image src={w.img} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 50vw, 33vw" />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm font-semibold text-foreground">{w.line}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{w.out}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ABOUT */}
      <section className={`${sectionY}`}>
        <div className={`${shell} max-w-2xl`}>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built Around Better Living</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>Hestia started as renovations, became a full system.</p>
            <p>
              Our work is organized, but the intent is human: better living, better assets, and better peace of mind when
              you hand someone the keys.
            </p>
          </div>
          <Button asChild variant="link" className="mt-8 h-auto p-0 text-base font-semibold text-primary">
            <Link href="/about">Read more about us</Link>
          </Button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border/40 bg-brand-surface py-16 text-brand-surface-foreground sm:py-20 lg:py-24">
        <div className={`${shell} text-center`}>
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            Ready to feel confident about your property?
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 min-w-[11rem] px-8 text-base font-semibold">
              <Link href="/inquire?inquiryType=owner">Manage My Property</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-w-[11rem] border-brand-surface-muted/40 bg-transparent px-8 text-base font-semibold text-brand-surface-foreground hover:bg-white/5"
            >
              <Link href="/inquire?inquiryType=contracting">Start a Project</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
