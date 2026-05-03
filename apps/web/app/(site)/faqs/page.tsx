import Link from "next/link";
import { SITE_SHELL_CLASS } from "@/lib/marketing/site-shell";

const faqs = [
  {
    q: "What does Hestia manage day-to-day?",
    a: "Leasing and renewals, rent collection, inspections, maintenance coordination, tenant communication through the portal, and regular reporting for owners."
  },
  {
    q: "How do tenants submit maintenance requests?",
    a: "Tenants use the client portal so requests are tracked, prioritized, and closed with documentation—reducing noise and missed follow-ups."
  },
  {
    q: "Do you handle renovations as well as management?",
    a: "Yes. We deliver fit-out and remodeling with clear scope, fixed pricing options where appropriate, and warranty-backed workmanship."
  },
  {
    q: "Where do you operate?",
    a: "We are Doha-based and work across Qatar, with processes tuned to local leasing norms and contractor coordination."
  },
  {
    q: "How do we get started?",
    a: "Use the inquiry form to share your property or project. We’ll align on scope, reporting cadence, and next steps."
  }
] as const;

export default function FaqsPage() {
  return (
    <div className="border-b border-border bg-background">
      <div className={`${SITE_SHELL_CLASS} py-14 sm:py-16 lg:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">FAQs</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Common questions</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Straight answers on how we work with owners, tenants, and contractors. For a tailored proposal,{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            contact us
          </Link>
          .
        </p>
        <dl className="mt-14 max-w-3xl space-y-10">
          {faqs.map((item) => (
            <div key={item.q}>
              <dt className="text-lg font-semibold text-foreground">{item.q}</dt>
              <dd className="mt-3 text-base leading-relaxed text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
