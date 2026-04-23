"use server";

import { prisma } from "@/lib/prisma";
import { isLeadInquiryType, type LeadInquiryType } from "@/lib/inquiries/constants";

export type SubmitLeadInquiryResult = { ok: true } | { ok: false; error: string };

function sanitizeContext(
  type: LeadInquiryType,
  raw: Record<string, unknown> | undefined
): Record<string, string> | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const out: Record<string, string> = {};
  const take = (key: string, max = 500) => {
    const v = raw[key];
    if (typeof v !== "string") {
      return;
    }
    const t = v.trim().slice(0, max);
    if (t) {
      out[key] = t;
    }
  };
  if (type === "owner") {
    take("propertyOrAreaInterest", 500);
    take("portfolioSize", 120);
  } else if (type === "tenant") {
    take("moveInTimeframe", 200);
    take("unitSizePreference", 200);
  } else {
    take("projectType", 200);
    take("timeline", 200);
  }
  return Object.keys(out).length ? out : null;
}

export async function submitLeadInquiry(input: {
  inquiryType: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  context?: Record<string, unknown>;
}): Promise<SubmitLeadInquiryResult> {
  if (!isLeadInquiryType(input.inquiryType)) {
    return { ok: false, error: "invalid_type" };
  }
  const fullName = input.fullName.trim().slice(0, 200);
  const phone = input.phone.trim().slice(0, 40);
  const email = input.email.trim().toLowerCase().slice(0, 254);
  const message = input.message.trim().slice(0, 8000);
  if (!fullName || !phone || !email || !message) {
    return { ok: false, error: "missing_fields" };
  }
  const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simpleEmail.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const context = sanitizeContext(input.inquiryType, input.context);

  try {
    await prisma.leadInquiry.create({
      data: {
        inquiryType: input.inquiryType,
        status: "new",
        fullName,
        phone,
        email,
        message,
        context: context ?? undefined
      }
    });
  } catch {
    return { ok: false, error: "server_error" };
  }

  return { ok: true };
}
