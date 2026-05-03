import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

export const metadata: Metadata = {
  title: "Case studies · Hestia Real Estate Development",
  description: "Selected management, renovation, and maintenance work across Doha."
};

const cases = [
  {
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
    title: "West Bay — 2BR",
    text: "Staged, leased, and fully managed with tenant onboarding and maintenance tracking."
  },
  {
    img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop",
    title: "The Pearl — full fit-out",
    text: "Scope-locked renovation, then handover with warranty pack and photos."
  },
  {
    img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
    title: "Lusail — building ops",
    text: "Central coordination for suppliers, owners, and recurring compliance checks."
  },
  {
    img: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1200&auto=format&fit=crop",
    title: "Al Sadd — studio",
    text: "Fast turnaround between tenants; every handover photographed."
  },
  {
    img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1200&auto=format&fit=crop",
    title: "West Bay — kitchen & bath",
    text: "Waterproofing first, then finishes — built to survive real daily use."
  },
  {
    img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
    title: "Doha — landlord refresh",
    text: "Cosmetic upgrade that lifted rent without overcapitalising."
  }
] as const;

export default function PortfolioPage() {
  return (
    <main className="bg-background pb-24 pt-12 text-foreground sm:pb-28 sm:pt-16">
      <div className={SITE_SHELL_CLASS}>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="font-medium hover:text-primary">
            ← Home
          </Link>
        </p>
        <header className="mt-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Case studies</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            A running log of how we manage, renovate, and maintain properties in Doha. Replace copy and imagery with
            your own wins as you publish them.
          </p>
        </header>
        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {cases.map((c) => (
            <li
              key={c.title}
              className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[16/11]">
                <Image src={c.img} alt="" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 33vw" />
              </div>
              <div className="p-6">
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex justify-center">
          <Button asChild size="lg">
            <Link href="/contact">Discuss a project</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
