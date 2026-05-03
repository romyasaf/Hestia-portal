"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  ownerAgreementGeneratesMonthlyExpenses,
  parseOwnerCreateContractType,
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
import { parsePropertyScope } from "@/lib/owner/property-scope";
import { getTableColumnSet, propertyTypeSelect } from "@/lib/db/table-columns";
import { prisma } from "@/lib/prisma";
import {
  createFixedLeaseScheduledExpensesInTx,
  createPmFixedFeeReceiptsInTx
} from "@/server/finance/owner-contract-automation";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 12 * 1024 * 1024;

export type CreateOwnerWithContractResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createOwnerWithContract(formData: FormData): Promise<CreateOwnerWithContractResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const fullName = text(formData, "fullName");
  const phone = text(formData, "phone");
  const ownerType = text(formData, "ownerType").toLowerCase();
  const qidNumber = text(formData, "qidNumber");
  const crNumber = text(formData, "crNumber");
  const propertyId = text(formData, "propertyId");
  const propertyScopeRaw = text(formData, "propertyScope");
  const buildingManagementStatusRaw = text(formData, "buildingManagementStatus");
  const contractTypeRaw = text(formData, "contractType");
  const startDateStr = text(formData, "contractStartDate");
  const endDateStr = text(formData, "contractEndDate");
  const fixedLeaseAmountStr = text(formData, "fixedLeaseAmount");
  const managementFeeStructureRaw = text(formData, "managementFeeStructure");
  const revenueCalculationMethodRaw =
    text(formData, "revenueCalculationMethod") || text(formData, "feeCalculationBasis");
  const managementFeePercentageRaw = text(formData, "managementFeePercentage");
  const monthlyManagementFeeAmountRaw = text(formData, "monthlyManagementFeeAmount");
  const file = formData.get("contractFile");

  if (!email || !password || password.length < 8) {
    return { ok: false, error: "weak_or_missing_password" };
  }
  if (!fullName) {
    return { ok: false, error: "missing_name" };
  }
  if (!phone) {
    return { ok: false, error: "missing_phone" };
  }
  if (ownerType !== "individual" && ownerType !== "company") {
    return { ok: false, error: "invalid_owner_type" };
  }
  if (ownerType === "individual" && !qidNumber) {
    return { ok: false, error: "missing_qid" };
  }
  if (ownerType === "company" && !crNumber) {
    return { ok: false, error: "missing_cr" };
  }
  if (!propertyId || !UUID_RE.test(propertyId)) {
    return { ok: false, error: "missing_property" };
  }

  const explicitPropertyScope = parsePropertyScope(propertyScopeRaw);
  if (!explicitPropertyScope) {
    return { ok: false, error: "missing_property_scope" };
  }
  const ownershipScope = explicitPropertyScope === "specific_units" ? "unit_owner" : "building_owner";

  const unitIdRawList = formData
    .getAll("unitId")
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter((id) => UUID_RE.test(id));

  if (ownershipScope === "unit_owner") {
    if (unitIdRawList.length === 0) {
      return { ok: false, error: "missing_units" };
    }
  }

  const createKind = parseOwnerCreateContractType(contractTypeRaw);
  if (!createKind) {
    return { ok: false, error: "invalid_contract_type" };
  }

  const storedContractType = createKind === "fixed_lease" ? "fixed_lease" : "property_management";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing_contract_file" };
  }

  let fixedAmount = 0;
  if (createKind === "fixed_lease") {
    fixedAmount = Number.parseFloat(fixedLeaseAmountStr);
    if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) {
      return { ok: false, error: "missing_fixed_lease_amount" };
    }
  }

  let managementFeeStructureDb: string | null = null;
  let managementFeePercentage: Prisma.Decimal | null = null;
  let monthlyManagementFeeAmount: Prisma.Decimal | null = null;
  let revenueCalculationMethodDb: string | null = null;
  if (createKind === "property_management") {
    const mf = validateManagementFeeInput({
      structureRaw: managementFeeStructureRaw,
      basisRaw: revenueCalculationMethodRaw,
      percentageRaw: managementFeePercentageRaw,
      monthlyRaw: monthlyManagementFeeAmountRaw
    });
    if (!mf.ok) {
      return { ok: false, error: mf.error };
    }
    managementFeeStructureDb = managementFeeStructureForDb(mf.data.managementFeeStructure);
    managementFeePercentage = mf.data.managementFeePercentage;
    monthlyManagementFeeAmount = mf.data.monthlyManagementFeeAmount;
    revenueCalculationMethodDb = revenueCalculationMethodForDb(mf.data.feeCalculationBasis);
  }

  const start = new Date(`${startDateStr}T12:00:00.000Z`);
  const end = new Date(`${endDateStr}T12:00:00.000Z`);
  if (!startDateStr || !endDateStr || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { ok: false, error: "invalid_contract_dates" };
  }

  const propertyCols = await getTableColumnSet("properties");
  const profileCols = await getTableColumnSet("owner_profiles");
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ...propertyTypeSelect(propertyCols) }
  });
  if (!prop) {
    return { ok: false, error: "invalid_property" };
  }
  const propType = (prop as { propertyType?: string | null }).propertyType;
  if (explicitPropertyScope === "whole_villa" && (propType ?? "").trim().toLowerCase() !== "villa") {
    return { ok: false, error: "invalid_villa_property" };
  }

  if (ownershipScope === "unit_owner") {
    const unitsCheck = await prisma.unit.findMany({
      where: { id: { in: unitIdRawList } },
      select: { id: true, propertyId: true, ownerUserId: true }
    });
    if (unitsCheck.length !== unitIdRawList.length) {
      return { ok: false, error: "invalid_units" };
    }
    if (unitsCheck.some((u) => u.propertyId !== propertyId)) {
      return { ok: false, error: "unit_property_mismatch" };
    }
    if (unitsCheck.some((u) => u.ownerUserId != null)) {
      return { ok: false, error: "unit_already_assigned" };
    }
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "email_in_use" };
  }

  const role = await prisma.role.findUnique({ where: { code: "owner" }, select: { id: true } });
  if (!role) {
    return { ok: false, error: "no_owner_role" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  const mime = file.type;
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(mime)) {
    return { ok: false, error: "invalid_file_type" };
  }
  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

  const defaultProfileContractType = createKind === "fixed_lease" ? "operator" : "managed";
  const monthAmount =
    createKind === "fixed_lease" ? new Prisma.Decimal(fixedAmount) : new Prisma.Decimal(0);
  const ctParsed = parseStoredOwnerAgreementType(storedContractType);
  const months = listUtcMonthStartsInclusive(start, end);
  const needsExpenseSchedule = ownerAgreementGeneratesMonthlyExpenses(ctParsed) && Number(monthAmount) > 0;
  const feeStructure = parseManagementFeeStructure(managementFeeStructureDb ?? "");
  const needsPmFixedReceipts =
    storedContractType === "property_management" &&
    (feeStructure === "fixed_monthly" || feeStructure === "hybrid") &&
    monthlyManagementFeeAmount != null &&
    Number(monthlyManagementFeeAmount.toString()) > 0;
  const pmFixedRowsPerMonth =
    ownershipScope === "unit_owner" && unitIdRawList.length > 1
      ? unitIdRawList.length
      : ownershipScope === "unit_owner" && unitIdRawList.length === 1
        ? 1
        : 1;
  if (needsExpenseSchedule) {
    if (months.length === 0) {
      return { ok: false, error: "no_schedule" };
    }
    if (months.length > 600) {
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

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        INSERT INTO users (email, password_hash, full_name, phone, is_active)
        VALUES (
          ${email},
          crypt(${password}, gen_salt('bf')),
          ${fullName},
          ${phone},
          true
        )
        RETURNING id
      `);

      const uid = inserted[0]?.id;
      if (!uid) {
        throw new Error("insert_failed");
      }

      await tx.userRole.create({ data: { userId: uid, roleId: role.id } });

      const profileCreate: Prisma.OwnerProfileUncheckedCreateInput = {
        userId: uid,
        ownerType,
        qidNumber: ownerType === "individual" ? qidNumber : null,
        commercialRegistrationNumber: ownerType === "company" ? crNumber : null,
        defaultOwnerContractType: defaultProfileContractType
      };
      if (profileCols.has("ownership_scope")) {
        profileCreate.ownershipScope = ownershipScope;
      }
      await tx.ownerProfile.create({ data: profileCreate });

      const managementStatusForProperty =
        ownershipScope === "unit_owner"
          ? buildingManagementStatusRaw.trim().toLowerCase() === "managed_by_hestia"
            ? "managed_by_hestia"
            : "location_only_not_managed"
          : "managed_by_hestia";

      if (ownershipScope === "building_owner") {
        const propData: Prisma.PropertyUncheckedUpdateInput = {
          ownerUserId: uid,
          ownerContractType: defaultProfileContractType
        };
        if (propertyCols.has("management_status")) {
          propData.managementStatus = managementStatusForProperty;
        }
        await tx.property.update({
          where: { id: propertyId },
          data: propData
        });
        await tx.unit.updateMany({
          where: { propertyId, ownerUserId: null },
          data: { ownershipSource: "inherited_from_building_contract" }
        });
      } else {
        if (propertyCols.has("management_status")) {
          await tx.property.update({
            where: { id: propertyId },
            data: { managementStatus: managementStatusForProperty }
          });
        }
        await tx.unit.updateMany({
          where: { id: { in: unitIdRawList } },
          data: { ownerUserId: uid, ownershipSource: "direct_unit_owner_contract" }
        });
      }

      const appliesToUnitIds =
        ownershipScope === "unit_owner" && unitIdRawList.length > 1 ? unitIdRawList : null;
      const contractUnitId =
        ownershipScope === "unit_owner" && unitIdRawList.length === 1 ? unitIdRawList[0]! : null;

      const contract = await tx.ownerContract.create({
        data: {
          ownerUserId: uid,
          propertyId,
          unitId: contractUnitId,
          propertyScope: explicitPropertyScope,
          contractType: storedContractType,
          startDate: start,
          endDate: end,
          contractStatus: computeContractLifecycleStatus(start, end),
          paymentFrequency: "monthly",
          amount: monthAmount,
          managementFeeStructure: managementFeeStructureDb,
          managementFeePercentage,
          monthlyManagementFeeAmount,
          revenueCalculationMethod: revenueCalculationMethodDb,
          ...(appliesToUnitIds ? { appliesToUnitIds } : {}),
          documentUrl: null,
          notes: "Initial owner agreement"
        },
        select: { id: true }
      });

      if (needsExpenseSchedule) {
        const vendor = fullName;
        const expenseUnitIds =
          ownershipScope === "unit_owner" && unitIdRawList.length > 1 ? unitIdRawList : null;
        await createFixedLeaseScheduledExpensesInTx(tx, {
          contractId: contract.id,
          contractType: storedContractType,
          propertyId,
          unitId: contractUnitId,
          expenseUnitIds,
          months,
          totalMonthlyAmount: monthAmount,
          vendorName: vendor
        });
      }

      if (needsPmFixedReceipts && monthlyManagementFeeAmount) {
        await createPmFixedFeeReceiptsInTx(tx, {
          contractId: contract.id,
          propertyId,
          unitId: contractUnitId,
          appliesToUnitIds: appliesToUnitIds ?? null,
          months,
          monthlyFee: monthlyManagementFeeAmount,
          ownerName: fullName
        });
      }

      return uid;
    });

    const dir = join(process.cwd(), "public", "uploads", "owner-contracts", userId);
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    await writeFile(join(dir, name), buf);
    const documentUrl = `/uploads/owner-contracts/${userId}/${name}`;

    const contractRow = await prisma.ownerContract.findFirst({
      where: { ownerUserId: userId, propertyId, documentUrl: null },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    if (contractRow) {
      await prisma.ownerContract.update({
        where: { id: contractRow.id },
        data: { documentUrl }
      });
    }

    revalidatePath("/admin/owners");
    revalidatePath(`/admin/owners/${userId}`);
    revalidatePath("/admin/properties");
    revalidatePath("/admin/portfolio");
    revalidatePath("/admin/finance");
    revalidatePath("/admin/expenses");
    revalidatePath("/owner/dashboard");
    revalidatePath("/owner/financials");

    return { ok: true, userId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "email_in_use" };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return { ok: false, error: "database_schema_outdated" };
    }
    if (e instanceof Error && e.message === "insert_failed") {
      return { ok: false, error: "insert_failed" };
    }
    throw e;
  }
}
