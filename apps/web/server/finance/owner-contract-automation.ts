import { Prisma } from "@prisma/client";
import { parseAppliesToUnitIds } from "@/lib/owner/applies-to-units";
import {
  COMMISSION_INCOME_SUBCATEGORY,
  FIXED_LEASE_EXPENSE_SUBCATEGORY,
  FIXED_MANAGEMENT_FEE_SUBCATEGORY,
  MANAGEMENT_REVENUE_CATEGORY,
  OWNER_PAYOUT_CATEGORY
} from "@/lib/owner/finance-categories";
import {
  parseFeeCalculationBasis,
  parseManagementFeeStructure
} from "@/lib/owner/management-fee";
import { splitMoneyEqualParts } from "@/lib/owner/split-money-equal";
import { allocateReceiptNo } from "@/server/accounting/receipt-no";
import { prisma } from "@/lib/prisma";

export type FinanceTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function utcMonthBounds(d: Date): { start: Date; end: Date } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 12, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 12, 0, 0, 0));
  return { start, end };
}

function contractCoversLeaseUnit(
  contract: {
    propertyId: string | null;
    unitId: string | null;
    appliesToUnitIds: unknown;
  },
  leaseUnitId: string,
  leasePropertyId: string
): boolean {
  if (!contract.propertyId || contract.propertyId !== leasePropertyId) {
    return false;
  }
  const extras = parseAppliesToUnitIds(contract.appliesToUnitIds);
  if (contract.unitId && contract.unitId === leaseUnitId) {
    return true;
  }
  if (extras.includes(leaseUnitId)) {
    return true;
  }
  if (!contract.unitId && extras.length === 0) {
    return true;
  }
  return false;
}

export async function createFixedLeaseScheduledExpensesInTx(
  tx: FinanceTx,
  input: {
    contractId: string;
    contractType: string;
    propertyId: string | null;
    unitId: string | null;
    expenseUnitIds: string[] | null;
    months: Date[];
    totalMonthlyAmount: Prisma.Decimal;
    vendorName: string;
  }
): Promise<void> {
  const sub = FIXED_LEASE_EXPENSE_SUBCATEGORY;
  const notesPrefix = `Owner contract (${input.contractType})`;

  if (input.expenseUnitIds && input.expenseUnitIds.length > 0) {
    const parts = splitMoneyEqualParts(Number(input.totalMonthlyAmount.toString()), input.expenseUnitIds.length);
    const perUnit = parts.map((p) => new Prisma.Decimal(p));
    for (const d of input.months) {
      for (let i = 0; i < input.expenseUnitIds.length; i += 1) {
        await tx.expense.create({
          data: {
            propertyId: input.propertyId,
            unitId: input.expenseUnitIds[i]!,
            ownerContractId: input.contractId,
            category: OWNER_PAYOUT_CATEGORY,
            subcategory: sub,
            amount: perUnit[i]!,
            vendorName: input.vendorName,
            expenseDate: d,
            paymentStatus: "pending",
            notes: `${notesPrefix} · ${d.toISOString().slice(0, 7)} · unit`
          }
        });
      }
    }
    return;
  }

  for (const d of input.months) {
    await tx.expense.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        ownerContractId: input.contractId,
        category: OWNER_PAYOUT_CATEGORY,
        subcategory: sub,
        amount: input.totalMonthlyAmount,
        vendorName: input.vendorName,
        expenseDate: d,
        paymentStatus: "pending",
        notes: `${notesPrefix} · ${d.toISOString().slice(0, 7)}`
      }
    });
  }
}

export async function createPmFixedFeeReceiptsInTx(
  tx: FinanceTx,
  input: {
    contractId: string;
    propertyId: string | null;
    unitId: string | null;
    appliesToUnitIds: unknown;
    months: Date[];
    monthlyFee: Prisma.Decimal;
    ownerName: string;
  }
): Promise<void> {
  const extras = parseAppliesToUnitIds(input.appliesToUnitIds);
  const splitUnitIds =
    extras.length > 1 ? extras : extras.length === 1 ? extras : input.unitId ? [input.unitId] : [];

  for (const d of input.months) {
    const receivedAt = new Date(d);
    receivedAt.setUTCHours(12, 0, 0, 0);
    const monthKey = d.toISOString().slice(0, 7);

    if (splitUnitIds.length > 1) {
      const parts = splitMoneyEqualParts(Number(input.monthlyFee.toString()), splitUnitIds.length);
      for (let i = 0; i < splitUnitIds.length; i += 1) {
        const receiptNo = await allocateReceiptNo(tx);
        await tx.receipt.create({
          data: {
            receiptNo,
            leaseId: null,
            ownerContractId: input.contractId,
            category: MANAGEMENT_REVENUE_CATEGORY,
            subcategory: FIXED_MANAGEMENT_FEE_SUBCATEGORY,
            amount: new Prisma.Decimal(parts[i]!),
            receivedAt,
            method: "scheduled",
            referenceNo: `pm_fixed:${input.contractId}:${splitUnitIds[i]}:${monthKey}`,
            paymentStatus: "pending",
            notes: `Fixed management fee (unit split) · ${input.ownerName} · ${monthKey}`,
            recordedByUserId: null
          }
        });
      }
    } else {
      const receiptNo = await allocateReceiptNo(tx);
      await tx.receipt.create({
        data: {
          receiptNo,
          leaseId: null,
          ownerContractId: input.contractId,
          category: MANAGEMENT_REVENUE_CATEGORY,
          subcategory: FIXED_MANAGEMENT_FEE_SUBCATEGORY,
          amount: input.monthlyFee,
          receivedAt,
          method: "scheduled",
          referenceNo: `pm_fixed:${input.contractId}:${monthKey}`,
          paymentStatus: "pending",
          notes: `Fixed management fee · ${input.ownerName} · ${monthKey}`,
          recordedByUserId: null
        }
      });
    }
  }
}

async function sumDeductiblePropertyExpensesForMonth(
  tx: FinanceTx,
  input: {
    propertyId: string;
    unitIdForFilter: string | null;
    contractUnitScoped: boolean;
    monthStart: Date;
    monthEnd: Date;
  }
): Promise<Prisma.Decimal> {
  const ownerCategories = [OWNER_PAYOUT_CATEGORY, "owner_payment"];
  const where: Prisma.ExpenseWhereInput = {
    propertyId: input.propertyId,
    expenseDate: { gte: input.monthStart, lte: input.monthEnd },
    paymentStatus: { in: ["paid", "approved"] },
    NOT: {
      OR: ownerCategories.map((c) => ({
        category: { equals: c, mode: "insensitive" as const }
      }))
    }
  };
  if (input.contractUnitScoped && input.unitIdForFilter) {
    where.OR = [{ unitId: input.unitIdForFilter }, { unitId: null }];
  }
  const agg = await tx.expense.aggregate({
    where,
    _sum: { amount: true }
  });
  const v = agg._sum.amount;
  return v == null ? new Prisma.Decimal(0) : new Prisma.Decimal(v.toString());
}

/**
 * When tenant rent is recorded on a lease receipt, create commission income receipts
 * for active property-management contracts (percentage / hybrid) on that unit.
 */
export async function syncManagementCommissionForRentReceipt(tx: FinanceTx, rentReceiptId: string): Promise<void> {
  const rent = await tx.receipt.findUnique({
    where: { id: rentReceiptId },
    select: {
      id: true,
      leaseId: true,
      amount: true,
      receivedAt: true,
      category: true,
      subcategory: true,
      sourceReceiptId: true
    }
  });
  if (!rent?.leaseId || !rent.amount || Number(rent.amount) <= 0) {
    return;
  }
  const cat = (rent.category ?? "").toLowerCase();
  const sub = (rent.subcategory ?? "").toLowerCase();
  if (cat === MANAGEMENT_REVENUE_CATEGORY || sub === COMMISSION_INCOME_SUBCATEGORY) {
    return;
  }
  if (rent.sourceReceiptId) {
    return;
  }

  const lease = await tx.lease.findUnique({
    where: { id: rent.leaseId },
    select: {
      id: true,
      unitId: true,
      unit: { select: { propertyId: true } }
    }
  });
  if (!lease) {
    return;
  }

  const at = new Date(rent.receivedAt);
  const atDate = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const { start: monthStart, end: monthEnd } = utcMonthBounds(at);

  const contracts = await tx.ownerContract.findMany({
    where: {
      contractType: "property_management",
      propertyId: lease.unit.propertyId,
      startDate: { lte: atDate },
      endDate: { gte: atDate }
    },
    select: {
      id: true,
      ownerUserId: true,
      unitId: true,
      propertyId: true,
      appliesToUnitIds: true,
      managementFeeStructure: true,
      managementFeePercentage: true,
      revenueCalculationMethod: true
    }
  });

  const gross = new Prisma.Decimal(rent.amount.toString());

  for (const c of contracts) {
    if (!contractCoversLeaseUnit(c, lease.unitId, lease.unit.propertyId)) {
      continue;
    }
    const structure = parseManagementFeeStructure(c.managementFeeStructure);
    if (structure !== "percentage" && structure !== "hybrid") {
      continue;
    }
    const pct = c.managementFeePercentage;
    if (pct == null) {
      continue;
    }
    const pctNum = Number(pct.toString());
    if (!Number.isFinite(pctNum) || pctNum <= 0) {
      continue;
    }

    const existing = await tx.receipt.findFirst({
      where: { sourceReceiptId: rent.id, ownerContractId: c.id },
      select: { id: true }
    });
    if (existing) {
      continue;
    }

    const basis = parseFeeCalculationBasis(c.revenueCalculationMethod);
    const unitScoped = Boolean(c.unitId) || parseAppliesToUnitIds(c.appliesToUnitIds).length > 0;
    let base = gross;
    if (basis === "after_expenses") {
      const deductions = await sumDeductiblePropertyExpensesForMonth(tx, {
        propertyId: lease.unit.propertyId,
        unitIdForFilter: lease.unitId,
        contractUnitScoped: unitScoped,
        monthStart,
        monthEnd
      });
      base = gross.sub(deductions);
      if (Number(base.toString()) <= 0) {
        continue;
      }
    }

    const commission = base.mul(new Prisma.Decimal(pctNum)).div(new Prisma.Decimal(100));
    if (Number(commission.toString()) <= 0) {
      continue;
    }

    const receiptNo = await allocateReceiptNo(tx);
    const owner = await tx.user.findUnique({
      where: { id: c.ownerUserId },
      select: { fullName: true }
    });
    const ownerName = owner?.fullName?.trim() || "Owner";

    await tx.receipt.create({
      data: {
        receiptNo,
        leaseId: rent.leaseId,
        ownerContractId: c.id,
        sourceReceiptId: rent.id,
        category: MANAGEMENT_REVENUE_CATEGORY,
        subcategory: COMMISSION_INCOME_SUBCATEGORY,
        amount: commission,
        receivedAt: rent.receivedAt,
        method: "management_commission",
        referenceNo: `commission:${rent.id}:${c.id}`,
        paymentStatus: "recorded",
        notes: `Commission income · ${ownerName} · from rent receipt`,
        recordedByUserId: null
      }
    });
  }
}
