"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { assertUserHasOwnerRole } from "@/server/actions/admin-entities";
import {
  ownerAgreementGeneratesMonthlyExpenses,
  parseStoredOwnerAgreementType
} from "@/lib/owner/agreement-contract";
import { computeContractLifecycleStatus } from "@/lib/owner/contract-status";
import {
  managementFeeStructureForDb,
  parseManagementFeeStructure,
  revenueCalculationMethodForDb,
  validateManagementFeeInput
} from "@/lib/owner/management-fee";
import { listUtcMonthStartsInclusive } from "@/lib/owner/owner-contract-schedule";
import { resolvePropertyScopeForOwnerContract } from "@/lib/owner/resolve-property-scope";
import { prisma } from "@/lib/prisma";
import {
  createFixedLeaseScheduledExpensesInTx,
  createPmFixedFeeReceiptsInTx
} from "@/server/finance/owner-contract-automation";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OwnerContractActionResult = { ok: true } | { ok: false; error: string };

export type OwnerContractScheduleRow = {
  id: string;
  expenseDate: string;
  amount: string;
  paymentStatus: string;
};

export async function getOwnerContractScheduleForAdmin(input: {
  contractId: string;
  ownerUserId: string;
}): Promise<{ ok: true; rows: OwnerContractScheduleRow[] } | { ok: false; error: string }> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const cid = input.contractId?.trim();
  const oid = input.ownerUserId?.trim();
  if (!cid || !oid) {
    return { ok: false, error: "invalid_input" };
  }
  const row = await prisma.ownerContract.findFirst({
    where: { id: cid, ownerUserId: oid },
    select: {
      expenses: {
        orderBy: { expenseDate: "asc" },
        take: 500,
        select: { id: true, expenseDate: true, amount: true, paymentStatus: true }
      }
    }
  });
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  return {
    ok: true,
    rows: row.expenses.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate.toISOString().slice(0, 10),
      amount: e.amount.toString(),
      paymentStatus: e.paymentStatus.trim().toLowerCase()
    }))
  };
}

export async function createOwnerContract(input: {
  ownerUserId: string;
  propertyId?: string;
  unitId?: string;
  contractType: string;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  amount: string;
  documentUrl?: string;
  notes?: string;
  /** Required when `contractType` is `property_management`. */
  managementFeeStructure?: string;
  managementFeePercentage?: string;
  monthlyManagementFeeAmount?: string;
  revenueCalculationMethod?: string;
  /** @deprecated Use revenueCalculationMethod */
  feeCalculationBasis?: string;
  propertyScope?: string;
  /** Two or more UUIDs: one contract covering multiple owned units; installments split equally per unit. */
  coveredUnitIds?: string[];
}): Promise<OwnerContractActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const ownerUserId = input.ownerUserId?.trim();
  if (!ownerUserId || !(await assertUserHasOwnerRole(ownerUserId))) {
    return { ok: false, error: "invalid_owner" };
  }

  const pid = input.propertyId?.trim() || null;
  const uid = input.unitId?.trim() || null;
  if (!pid && !uid) {
    return { ok: false, error: "missing_scope" };
  }

  let propertyId = pid;
  let unitId = uid;
  let appliesToUnitIds: string[] | null = null;

  const covered = [...new Set((input.coveredUnitIds ?? []).map((s) => s.trim()).filter((s) => UUID_RE.test(s)))];
  if (covered.length > 0) {
    const units = await prisma.unit.findMany({
      where: { id: { in: covered } },
      select: { id: true, propertyId: true, ownerUserId: true }
    });
    if (units.length !== covered.length) {
      return { ok: false, error: "invalid_unit" };
    }
    if (units.some((u) => u.ownerUserId !== ownerUserId)) {
      return { ok: false, error: "unit_not_owned_by_party" };
    }
    const pids = [...new Set(units.map((u) => u.propertyId))];
    if (pids.length !== 1) {
      return { ok: false, error: "unit_property_mismatch" };
    }
    propertyId = pids[0]!;
    if (covered.length === 1) {
      unitId = covered[0]!;
    } else {
      unitId = null;
      appliesToUnitIds = covered;
    }
  } else if (unitId) {
    const u = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, propertyId: true, ownerUserId: true }
    });
    if (!u) {
      return { ok: false, error: "invalid_unit" };
    }
    if (u.ownerUserId !== ownerUserId) {
      return { ok: false, error: "unit_not_owned_by_party" };
    }
    if (propertyId && propertyId !== u.propertyId) {
      return { ok: false, error: "unit_property_mismatch" };
    }
    propertyId = u.propertyId;
  } else if (propertyId) {
    const p = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerUserId: true }
    });
    if (!p) {
      return { ok: false, error: "invalid_property" };
    }
    if (p.ownerUserId !== ownerUserId) {
      return { ok: false, error: "property_not_owned_by_party" };
    }
  }

  const freq = (input.paymentFrequency ?? "monthly").trim().toLowerCase();
  if (freq !== "monthly") {
    return { ok: false, error: "unsupported_frequency" };
  }

  const start = new Date(`${input.startDate.trim()}T12:00:00.000Z`);
  const end = new Date(`${input.endDate.trim()}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { ok: false, error: "invalid_dates" };
  }

  const contractType = parseStoredOwnerAgreementType(input.contractType);

  let managementFeeStructureDb: string | null = null;
  let managementFeePercentage: Prisma.Decimal | null = null;
  let monthlyManagementFeeAmount: Prisma.Decimal | null = null;
  let revenueCalculationMethodDb: string | null = null;

  let amt = 0;
  if (contractType === "property_management") {
    const basisRaw = input.revenueCalculationMethod ?? input.feeCalculationBasis ?? "";
    const mf = validateManagementFeeInput({
      structureRaw: input.managementFeeStructure ?? "",
      basisRaw,
      percentageRaw: input.managementFeePercentage ?? "",
      monthlyRaw: input.monthlyManagementFeeAmount ?? ""
    });
    if (!mf.ok) {
      return { ok: false, error: mf.error };
    }
    managementFeeStructureDb = managementFeeStructureForDb(mf.data.managementFeeStructure);
    managementFeePercentage = mf.data.managementFeePercentage;
    monthlyManagementFeeAmount = mf.data.monthlyManagementFeeAmount;
    revenueCalculationMethodDb = revenueCalculationMethodForDb(mf.data.feeCalculationBasis);
    amt = 0;
  } else {
    amt = Number.parseFloat((input.amount ?? "0").trim());
    if (!Number.isFinite(amt) || amt < 0) {
      return { ok: false, error: "invalid_amount" };
    }
    if (ownerAgreementGeneratesMonthlyExpenses(contractType)) {
      if (amt <= 0) {
        return { ok: false, error: "invalid_amount" };
      }
    } else {
      amt = 0;
    }
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { fullName: true }
  });
  if (!owner) {
    return { ok: false, error: "invalid_owner" };
  }

  const months = listUtcMonthStartsInclusive(start, end);
  const needsExpenseSchedule = ownerAgreementGeneratesMonthlyExpenses(contractType) && amt > 0;
  const expenseUnitIds = appliesToUnitIds && appliesToUnitIds.length > 0 ? appliesToUnitIds : null;
  const feeStructure = parseManagementFeeStructure(managementFeeStructureDb ?? "");
  const needsPmFixedReceipts =
    contractType === "property_management" &&
    (feeStructure === "fixed_monthly" || feeStructure === "hybrid") &&
    monthlyManagementFeeAmount != null &&
    Number(monthlyManagementFeeAmount.toString()) > 0;
  const pmFixedRowsPerMonth =
    expenseUnitIds && expenseUnitIds.length > 1
      ? expenseUnitIds.length
      : expenseUnitIds && expenseUnitIds.length === 1
        ? 1
        : unitId
          ? 1
          : 1;
  if (needsExpenseSchedule) {
    if (months.length === 0) {
      return { ok: false, error: "no_schedule" };
    }
    if (months.length > 600) {
      return { ok: false, error: "schedule_too_long" };
    }
    if (expenseUnitIds && expenseUnitIds.length * months.length > 50_000) {
      return { ok: false, error: "schedule_too_long" };
    }
  }
  if (needsPmFixedReceipts) {
    if (months.length === 0) {
      return { ok: false, error: "no_schedule" };
    }
    if (months.length > 600) {
      return { ok: false, error: "schedule_too_long" };
    }
    if (months.length * pmFixedRowsPerMonth > 50_000) {
      return { ok: false, error: "schedule_too_long" };
    }
  }

  const doc = input.documentUrl?.trim() || null;
  const notes = input.notes?.trim() || null;

  const propertyScopeResolved = await resolvePropertyScopeForOwnerContract(prisma, {
    explicitScopeRaw: input.propertyScope,
    propertyId,
    unitId,
    appliesToUnitIds
  });

  await prisma.$transaction(async (tx) => {
    const contract = await tx.ownerContract.create({
      data: {
        ownerUserId,
        propertyId,
        unitId,
        propertyScope: propertyScopeResolved,
        contractType,
        startDate: start,
        endDate: end,
        contractStatus: computeContractLifecycleStatus(start, end),
        paymentFrequency: "monthly",
        amount: new Prisma.Decimal(amt),
        managementFeeStructure: managementFeeStructureDb,
        managementFeePercentage,
        monthlyManagementFeeAmount,
        revenueCalculationMethod: revenueCalculationMethodDb,
        ...(appliesToUnitIds && appliesToUnitIds.length > 0 ? { appliesToUnitIds } : {}),
        documentUrl: doc,
        notes
      },
      select: { id: true }
    });

    if (needsExpenseSchedule) {
      const vendor = owner.fullName.trim() || "Owner";
      await createFixedLeaseScheduledExpensesInTx(tx, {
        contractId: contract.id,
        contractType,
        propertyId,
        unitId,
        expenseUnitIds,
        months,
        totalMonthlyAmount: new Prisma.Decimal(amt),
        vendorName: vendor
      });
    }

    if (needsPmFixedReceipts && monthlyManagementFeeAmount) {
      const ownerName = owner.fullName.trim() || "Owner";
      await createPmFixedFeeReceiptsInTx(tx, {
        contractId: contract.id,
        propertyId,
        unitId,
        appliesToUnitIds: appliesToUnitIds && appliesToUnitIds.length > 0 ? appliesToUnitIds : null,
        months,
        monthlyFee: monthlyManagementFeeAmount,
        ownerName
      });
    }
  });

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${ownerUserId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/expenses");
  revalidatePath("/owner/financials");
  return { ok: true };
}

export async function deleteOwnerContract(input: { contractId: string }): Promise<OwnerContractActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const cid = input.contractId?.trim();
  if (!cid) {
    return { ok: false, error: "invalid_contract" };
  }

  const settled = await prisma.expense.count({
    where: {
      ownerContractId: cid,
      paymentStatus: { in: ["paid", "approved"] }
    }
  });
  if (settled > 0) {
    return { ok: false, error: "contract_has_settled_expenses" };
  }

  const row = await prisma.ownerContract.findUnique({
    where: { id: cid },
    select: { ownerUserId: true }
  });
  if (!row) {
    return { ok: false, error: "invalid_contract" };
  }

  await prisma.ownerContract.delete({ where: { id: cid } });

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${row.ownerUserId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/expenses");
  revalidatePath("/owner/financials");
  return { ok: true };
}
