"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { submitLeadInquiry } from "@/server/actions/inquiry-public";
import type { LeadInquiryType } from "@/lib/inquiries/constants";
import { leadInquiryTypeLabel } from "@/lib/inquiries/constants";
import { Button } from "@/components/ui/button";

type Props = {
  inquiryType: LeadInquiryType;
};

export function LeadInquiryForm({ inquiryType }: Props) {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [ctx1, setCtx1] = useState("");
  const [ctx2, setCtx2] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const labels =
    inquiryType === "owner"
      ? { a: "Building or area (optional)", b: "Portfolio size or context (optional)" }
      : inquiryType === "tenant"
        ? { a: "Move-in timing (optional)", b: "Unit type or beds / baths (optional)" }
        : { a: "Scope in one line (optional)", b: "Site dates or deadline (optional)" };

  const messageHint =
    inquiryType === "owner"
      ? "Asset name, city, and what you want handled — ownership changes, handover, or a problem to solve."
      : inquiryType === "tenant"
        ? "Building, unit, and what you need — a leak, keys, a date, or access before the app is live."
        : "Trade, floor or zone, access constraints, and who we should coordinate with on site.";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitted(false);
    const context: Record<string, string> = {};
    if (inquiryType === "owner") {
      if (ctx1.trim()) context.propertyOrAreaInterest = ctx1.trim();
      if (ctx2.trim()) context.portfolioSize = ctx2.trim();
    } else if (inquiryType === "tenant") {
      if (ctx1.trim()) context.moveInTimeframe = ctx1.trim();
      if (ctx2.trim()) context.unitSizePreference = ctx2.trim();
    } else {
      if (ctx1.trim()) context.projectType = ctx1.trim();
      if (ctx2.trim()) context.timeline = ctx2.trim();
    }
    startTransition(async () => {
      const res = await submitLeadInquiry({
        inquiryType,
        fullName,
        phone,
        email,
        message,
        context: Object.keys(context).length ? context : undefined
      });
      if (!res.ok) {
        setFeedback(
          res.error === "server_error"
            ? "Could not save just now — try again in a minute or call the office."
            : "Something in the form blocked send — check required fields and email format."
        );
        return;
      }
      setSubmitted(true);
      setFeedback(null);
      setFullName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setCtx1("");
      setCtx2("");
    });
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-8 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/12 text-emerald-700 dark:text-emerald-400">
          <span className="text-2xl leading-none" aria-hidden>
            ✓
          </span>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-bold tracking-tight text-foreground">Received — thank you</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your message is with our team. Expect a direct reply on the details you sent — typically within one business
            day — not a ticket number or a call centre script.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button asChild variant="default" className="h-11 flex-1 font-semibold">
            <Link href="/">Back to home</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 font-semibold"
            onClick={() => {
              setSubmitted(false);
            }}
          >
            Send another note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-lg space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm sm:space-y-6 sm:p-8"
      onSubmit={onSubmit}
    >
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="li-name">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="li-name"
          required
          autoComplete="name"
          placeholder="As it should appear on a reply"
          value={fullName}
          onChange={(ev) => setFullName(ev.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="li-phone">
          Phone <span className="text-destructive">*</span>
        </label>
        <input
          id="li-phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="Mobile you answer"
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="li-email">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="li-email"
          type="email"
          required
          autoComplete="email"
          placeholder="Where we should write back"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="li-msg">
          What do you need? <span className="text-destructive">*</span>
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">{messageHint}</p>
        <textarea
          id="li-msg"
          required
          rows={5}
          placeholder="Plain language is fine."
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="li-c1">
          {labels.a}
        </label>
        <input
          id="li-c1"
          value={ctx1}
          onChange={(ev) => setCtx1(ev.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="li-c2">
          {labels.b}
        </label>
        <input
          id="li-c2"
          value={ctx2}
          onChange={(ev) => setCtx2(ev.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {feedback ? <p className="text-sm font-medium text-destructive">{feedback}</p> : null}
      <div className="space-y-2">
        <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Hestia Real Estate Development — your details are used only to respond to this inquiry.
        </p>
      </div>
    </form>
  );
}
