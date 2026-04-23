"use client";

import Link from "next/link";
import { LEAD_INQUIRY_TYPES, type LeadInquiryType, leadInquiryTypeNavLabel } from "@/lib/inquiries/constants";
import { cn } from "@/lib/utils";

export function InquireTypeTabs({ active }: { active: LeadInquiryType }) {
  return (
    <div
      role="tablist"
      aria-label="Who you are"
      className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/50 p-2"
    >
      {LEAD_INQUIRY_TYPES.map((t) => {
        const isActive = t === active;
        return (
          <Link
            key={t}
            role="tab"
            aria-selected={isActive}
            href={`/inquire?inquiryType=${t}`}
            className={cn(
              "min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            )}
          >
            {leadInquiryTypeNavLabel(t)}
          </Link>
        );
      })}
    </div>
  );
}
