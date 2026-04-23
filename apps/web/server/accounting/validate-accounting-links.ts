import { prisma } from "@/lib/prisma";

export type AccountingLinkInput = {
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  ticketId?: string | null;
  invoiceId?: string | null;
  leaseCheckoutId?: string | null;
  jobId?: string | null;
};

/** Receipts must anchor to operational context (lease, ticket, invoice, or checkout). */
export function hasReceiptFinancialLink(input: AccountingLinkInput): boolean {
  return Boolean(
    input.leaseId?.trim() ||
      input.ticketId?.trim() ||
      input.invoiceId?.trim() ||
      input.leaseCheckoutId?.trim()
  );
}

/** Expenses must tie to property, unit, lease, ticket, job, or checkout (property-only = categorized opex). */
export function hasExpenseFinancialLink(input: AccountingLinkInput): boolean {
  return Boolean(
    input.propertyId?.trim() ||
      input.unitId?.trim() ||
      input.leaseId?.trim() ||
      input.ticketId?.trim() ||
      input.jobId?.trim() ||
      input.leaseCheckoutId?.trim()
  );
}

/**
 * Ensures linked records (when more than one anchor is set) refer to the same property graph.
 * Prevents cross-building receipt/expense mistakes in admin entry forms.
 */
export async function validateAccountingLinks(input: AccountingLinkInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const propertyIds = new Set<string>();

  const addPid = (id: string | null | undefined) => {
    if (id?.trim()) {
      propertyIds.add(id.trim());
    }
  };

  if (input.propertyId?.trim()) {
    addPid(input.propertyId.trim());
  }

  if (input.unitId?.trim()) {
    const u = await prisma.unit.findUnique({
      where: { id: input.unitId.trim() },
      select: { propertyId: true }
    });
    if (!u) {
      return { ok: false, error: "invalid_unit" };
    }
    addPid(u.propertyId);
    if (input.propertyId?.trim() && u.propertyId !== input.propertyId.trim()) {
      return { ok: false, error: "unit_property_mismatch" };
    }
  }

  if (input.leaseId?.trim()) {
    const lease = await prisma.lease.findUnique({
      where: { id: input.leaseId.trim() },
      include: { unit: { select: { propertyId: true } } }
    });
    if (!lease) {
      return { ok: false, error: "invalid_lease" };
    }
    addPid(lease.unit.propertyId);
  }

  if (input.ticketId?.trim()) {
    const t = await prisma.ticket.findUnique({
      where: { id: input.ticketId.trim() },
      select: { propertyId: true, leaseId: true, unitId: true }
    });
    if (!t) {
      return { ok: false, error: "invalid_ticket" };
    }
    addPid(t.propertyId);
    if (input.leaseId?.trim() && t.leaseId && t.leaseId !== input.leaseId.trim()) {
      return { ok: false, error: "ticket_lease_mismatch" };
    }
    if (input.unitId?.trim() && t.unitId && t.unitId !== input.unitId.trim()) {
      return { ok: false, error: "ticket_unit_mismatch" };
    }
  }

  if (input.invoiceId?.trim()) {
    const inv = await prisma.invoice.findUnique({
      where: { id: input.invoiceId.trim() },
      include: {
        lease: { include: { unit: { select: { propertyId: true } } } }
      }
    });
    if (!inv) {
      return { ok: false, error: "invalid_invoice" };
    }
    if (inv.lease?.unit?.propertyId) {
      addPid(inv.lease.unit.propertyId);
    }
    if (input.leaseId?.trim() && inv.leaseId && inv.leaseId !== input.leaseId.trim()) {
      return { ok: false, error: "invoice_lease_mismatch" };
    }
  }

  if (input.leaseCheckoutId?.trim()) {
    const co = await prisma.leaseCheckOut.findUnique({
      where: { id: input.leaseCheckoutId.trim() },
      include: {
        lease: { include: { unit: { select: { propertyId: true } } } }
      }
    });
    if (!co) {
      return { ok: false, error: "invalid_checkout" };
    }
    addPid(co.lease.unit.propertyId);
    if (input.leaseId?.trim() && co.leaseId !== input.leaseId.trim()) {
      return { ok: false, error: "checkout_lease_mismatch" };
    }
  }

  if (input.jobId?.trim()) {
    const j = await prisma.job.findUnique({
      where: { id: input.jobId.trim() },
      select: { propertyId: true, unitId: true }
    });
    if (!j) {
      return { ok: false, error: "invalid_job" };
    }
    if (j.propertyId) {
      addPid(j.propertyId);
    }
    if (input.unitId?.trim() && j.unitId && j.unitId !== input.unitId.trim()) {
      return { ok: false, error: "job_unit_mismatch" };
    }
    if (input.leaseId?.trim() && j.propertyId) {
      const leaseForJob = await prisma.lease.findUnique({
        where: { id: input.leaseId.trim() },
        include: { unit: { select: { propertyId: true } } }
      });
      if (leaseForJob && leaseForJob.unit.propertyId !== j.propertyId) {
        return { ok: false, error: "job_lease_property_mismatch" };
      }
    }
  }

  if (propertyIds.size > 1) {
    return { ok: false, error: "cross_property_links" };
  }

  return { ok: true };
}
