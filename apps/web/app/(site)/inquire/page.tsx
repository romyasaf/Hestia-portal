import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadInquiryForm } from "@/components/marketing/lead-inquiry-form";
import { InquireTypeTabs } from "@/components/marketing/inquire-type-tabs";
import { leadInquiryTypeLabel, parseLeadInquiryTypeFromSearchParams, type LeadInquiryType } from "@/lib/inquiries/constants";

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default function InquirePage({ searchParams }: Props) {
  const rawParam = searchParams.inquiryType ?? searchParams.type;
  const raw = typeof rawParam === "string" ? rawParam.trim() : "";
  const parsed = parseLeadInquiryTypeFromSearchParams(searchParams);

  if (raw && parsed === null) {
    notFound();
  }

  const inquiryType: LeadInquiryType = parsed ?? "tenant";
  const hadExplicitType = parsed !== null;

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-4 pb-20 pt-10 sm:space-y-12 sm:pb-24 sm:pt-14">
      <p className="text-sm">
        <Link href="/" className="font-medium text-muted-foreground transition hover:text-primary">
          ← Hestia home
        </Link>
      </p>

      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Write to us</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          One short form. We sort by audience so the right manager reads it first — switch the tab if we guessed wrong.
        </p>
      </header>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">You are</p>
        <InquireTypeTabs active={inquiryType} />
      </div>

      {!hadExplicitType ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Renters</span> is selected by default. Choose{" "}
          <span className="font-medium text-foreground">Owners</span> or{" "}
          <span className="font-medium text-foreground">Contracting</span> above if that fits you better.
        </p>
      ) : null}

      <section aria-labelledby="inquire-form-heading" className="space-y-6 border-t border-border pt-10 sm:pt-12">
        <div className="space-y-2">
          <h2 id="inquire-form-heading" className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Your message
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Routed as <span className="font-medium text-foreground">{leadInquiryTypeLabel(inquiryType)}</span>. Switch
            the tab above if that is not you.
          </p>
        </div>
        <LeadInquiryForm inquiryType={inquiryType} />
      </section>
    </main>
  );
}
