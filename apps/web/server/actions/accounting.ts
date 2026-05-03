"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { allocateReceiptNo } from "@/server/accounting/receipt-no";
import {
  hasExpenseFinancialLink,
  hasReceiptFinancialLink,
  validateAccountingLinks
} from "@/server/accounting/validate-accounting-links";
import { guardActionRoles } from "@/server/auth/action-guard";
import { syncManagementCommissionForRentReceipt } from "@/server/finance/owner-contract-automation";
import { syncInvoicePaymentStatus } from "@/server/queries/accounting";

export type AccountingActionResult = { ok: true } | { ok: false; error: string };

export async function createAccountingReceipt(input: {
  amount: string;
  method: string;
  referenceNo?: string;
  notes?: string;
  leaseId?: string;
  ticketId?: string;
  invoiceId?: string;
  leaseCheckoutId?: string;
  ownerContractId?: string;
  category?: string;
  subcategory?: string;
  paymentStatus?: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const amount = Number.parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }
  const method = input.method?.trim();
  if (!method) {
    return { ok: false, error: "missing_method" };
  }

  const ps = (input.paymentStatus ?? "recorded").trim().toLowerCase();

  if (
    !hasReceiptFinancialLink({
      leaseId: input.leaseId,
      ticketId: input.ticketId,
      invoiceId: input.invoiceId,
      leaseCheckoutId: input.leaseCheckoutId,
      ownerContractId: input.ownerContractId
    })
  ) {
    return { ok: false, error: "missing_financial_link" };
  }

  const linkCheck = await validateAccountingLinks({
    leaseId: input.leaseId,
    ticketId: input.ticketId,
    invoiceId: input.invoiceId,
    leaseCheckoutId: input.leaseCheckoutId,
    ownerContractId: input.ownerContractId
  });
  if (!linkCheck.ok) {
    return { ok: false, error: linkCheck.error };
  }

  const created = await prisma.$transaction(async (tx) => {
    const receiptNo = await allocateReceiptNo(tx);
    const row = await tx.receipt.create({
      data: {
        receiptNo,
        amount,
        method,
        referenceNo: input.referenceNo?.trim() || null,
        notes: input.notes?.trim() || null,
        leaseId: input.leaseId?.trim() || null,
        ticketId: input.ticketId?.trim() || null,
        invoiceId: input.invoiceId?.trim() || null,
        leaseCheckoutId: input.leaseCheckoutId?.trim() || null,
        ownerContractId: input.ownerContractId?.trim() || null,
        category: input.category?.trim() || null,
        subcategory: input.subcategory?.trim() || null,
        paymentStatus: ps,
        recordedByUserId: guard.userId
      },
      select: { id: true }
    });
    await syncManagementCommissionForRentReceipt(tx, row.id);
    return row;
  });

  auditLog({
    type: "financial",
    action: "receipt_create",
    actorUserId: guard.userId,
    recordType: "receipt",
    recordId: created.id,
    meta: { amount, paymentStatus: ps }
  });

  revalidatePath("/admin/receipts");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  revalidatePath("/tenant/receipts");
  return { ok: true };
}

export async function createAccountingExpense(input: {
  category: string;
  subcategory?: string;
  amount: string;
  expenseDate: string;
  vendorName?: string;
  notes?: string;
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  ticketId?: string;
  jobId?: string;
  leaseCheckoutId?: string;
  ownerContractId?: string;
  paymentStatus?: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const category = input.category?.trim();
  if (!category) {
    return { ok: false, error: "missing_category" };
  }
  const amount = Number.parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }
  const d = new Date(`${input.expenseDate.trim()}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "invalid_date" };
  }

  const ps = (input.paymentStatus ?? "pending").trim().toLowerCase();

  if (
    !hasExpenseFinancialLink({
      propertyId: input.propertyId,
      unitId: input.unitId,
      leaseId: input.leaseId,
      ticketId: input.ticketId,
      jobId: input.jobId,
      leaseCheckoutId: input.leaseCheckoutId,
      ownerContractId: input.ownerContractId
    })
  ) {
    return { ok: false, error: "missing_financial_link" };
  }

  const linkCheck = await validateAccountingLinks({
    propertyId: input.propertyId,
    unitId: input.unitId,
    leaseId: input.leaseId,
    ticketId: input.ticketId,
    jobId: input.jobId,
    leaseCheckoutId: input.leaseCheckoutId,
    ownerContractId: input.ownerContractId
  });
  if (!linkCheck.ok) {
    return { ok: false, error: linkCheck.error };
  }

  const created = await prisma.expense.create({
    data: {
      category,
      subcategory: input.subcategory?.trim() || null,
      amount,
      expenseDate: d,
      vendorName: input.vendorName?.trim() || null,
      notes: input.notes?.trim() || null,
      propertyId: input.propertyId?.trim() || null,
      unitId: input.unitId?.trim() || null,
      leaseId: input.leaseId?.trim() || null,
      ticketId: input.ticketId?.trim() || null,
      jobId: input.jobId?.trim() || null,
      leaseCheckoutId: input.leaseCheckoutId?.trim() || null,
      ownerContractId: input.ownerContractId?.trim() || null,
      paymentStatus: ps
    },
    select: { id: true }
  });

  auditLog({
    type: "financial",
    action: "expense_create",
    actorUserId: guard.userId,
    recordType: "expense",
    recordId: created.id,
    meta: { amount, category, paymentStatus: ps }
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function recordInvoicePayment(input: {
  invoiceId: string;
  amount: string;
  method: string;
  referenceNo?: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const amount = Number.parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }
  const method = input.method?.trim();
  if (!method) {
    return { ok: false, error: "missing_method" };
  }

  const inv = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { payments: true }
  });
  if (!inv) {
    return { ok: false, error: "not_found" };
  }

  const previousPaymentStatus = inv.paymentStatus.trim().toLowerCase();

  await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      amount,
      method,
      referenceNo: input.referenceNo?.trim() || null
    }
  });

  await syncInvoicePaymentStatus(inv.id);

  const after = await prisma.invoice.findUnique({
    where: { id: inv.id },
    select: { paymentStatus: true }
  });
  const newPaymentStatus = (after?.paymentStatus ?? previousPaymentStatus).trim().toLowerCase();

  auditLog({
    type: "financial",
    action: "invoice_record_payment",
    actorUserId: guard.userId,
    recordType: "invoice",
    recordId: inv.id,
    meta: {
      previousPaymentStatus,
      newPaymentStatus,
      amount,
      method
    }
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  revalidatePath("/tenant/receipts");
  return { ok: true };
}

export async function updateInvoicePaymentStatusAdmin(input: {
  invoiceId: string;
  paymentStatus: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const next = input.paymentStatus.trim().toLowerCase();
  const allowed = new Set(["unpaid", "partial", "paid", "overdue", "failed"]);
  if (!allowed.has(next)) {
    return { ok: false, error: "invalid_status" };
  }

  const inv = await prisma.invoice.findFirst({ where: { id: input.invoiceId }, select: { id: true } });
  if (!inv) {
    return { ok: false, error: "not_found" };
  }

  await prisma.invoice.update({
    where: { id: inv.id },
    data: { paymentStatus: next }
  });

  auditLog({
    type: "financial",
    action: "invoice_payment_status_set",
    actorUserId: guard.userId,
    recordType: "invoice",
    recordId: inv.id,
    meta: { paymentStatus: next }
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function updateExpensePaymentStatus(input: {
  expenseId: string;
  paymentStatus: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const next = input.paymentStatus.trim().toLowerCase();
  const expenseRow = await prisma.expense.findFirst({
    where: { id: input.expenseId },
    select: { id: true, ownerContract: { select: { ownerUserId: true } } }
  });
  if (!expenseRow) {
    return { ok: false, error: "not_found" };
  }
  await prisma.expense.update({
    where: { id: expenseRow.id },
    data: { paymentStatus: next }
  });

  auditLog({
    type: "financial",
    action: "expense_payment_status",
    actorUserId: guard.userId,
    recordType: "expense",
    recordId: expenseRow.id,
    meta: { paymentStatus: next }
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  if (expenseRow.ownerContract?.ownerUserId) {
    revalidatePath(`/admin/owners/${expenseRow.ownerContract.ownerUserId}`);
  }
  revalidatePath("/owner/financials");
  return { ok: true };
}

export async function updateReceiptPaymentStatus(input: {
  receiptId: string;
  paymentStatus: string;
}): Promise<AccountingActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const next = input.paymentStatus.trim().toLowerCase();
  const receiptRow = await prisma.receipt.findFirst({ where: { id: input.receiptId }, select: { id: true } });
  if (!receiptRow) {
    return { ok: false, error: "not_found" };
  }
  await prisma.receipt.update({
    where: { id: receiptRow.id },
    data: { paymentStatus: next }
  });

  auditLog({
    type: "financial",
    action: "receipt_payment_status",
    actorUserId: guard.userId,
    recordType: "receipt",
    recordId: receiptRow.id,
    meta: { paymentStatus: next }
  });

  revalidatePath("/admin/receipts");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/finance");
  return { ok: true };
}
