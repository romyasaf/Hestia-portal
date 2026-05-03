const PAYMENT_FREQUENCIES = ["monthly", "quarterly", "yearly", "weekly", "other"] as const;
export type LeasePaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export function normalizeLeasePaymentFrequency(raw: string | null | undefined): LeasePaymentFrequency {
  const s = (raw ?? "monthly").trim().toLowerCase();
  return (PAYMENT_FREQUENCIES as readonly string[]).includes(s) ? (s as LeasePaymentFrequency) : "monthly";
}

/** Admin + tenant portal: coarse digital signature pipeline. */
const DIGITAL_SIG = ["none", "pending", "signed", "declined"] as const;
export type LeaseDigitalSignatureStatus = (typeof DIGITAL_SIG)[number];

export function normalizeDigitalSignatureStatus(raw: string | null | undefined): LeaseDigitalSignatureStatus {
  const s = (raw ?? "none").trim().toLowerCase();
  return (DIGITAL_SIG as readonly string[]).includes(s) ? (s as LeaseDigitalSignatureStatus) : "none";
}
