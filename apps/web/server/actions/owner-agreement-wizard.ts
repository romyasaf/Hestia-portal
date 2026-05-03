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
import { parseOwnerContractType } from "@/lib/owner/contract";
import { computeContractLifecycleStatus } from "@/lib/owner/contract-status";
import {
  managementFeeStructureForDb,
  parseManagementFeeStructure,
  revenueCalculationMethodForDb,
  validateManagementFeeInput
} from "@/lib/owner/management-fee";
import { listUtcMonthStartsInclusive } from "@/lib/owner/owner-contract-schedule";
import { parsePropertyScope } from "@/lib/owner/property-scope";
import { prisma } from "@/lib/prisma";
import {
  createFixedLeaseScheduledExpensesInTx,
  createPmFixedFeeReceiptsInTx
} from "@/server/finance/owner-contract-automation";
import {
  ensureOwnerContractsAndProfileColumns,
  ensurePropertyAndUnitUpdatedAtColumns
} from "@/lib/db/ensure-updated-at-columns";
import { getTableColumnSet } from "@/lib/db/table-columns";
import { guardActionRoles } from "@/server/auth/action-guard";
import { allocateUniqueBuildingCode } from "@/server/actions/admin-entities";

const MAX_BYTES = 12 * 1024 * 1024;
const ADDRESS_PART_MAX = 128;

export type OwnerAgreementWizardResult =
  | { ok: true; userId: string; propertyId: string }
  | { ok: false; error: string; detail?: string };

/** Pre-025 DB: `management_fee_structure` CHECK allows percentage | fixed_monthly | hybrid only. */
function managementFeeStructureForLegacy022Column(structureDb: string | null): string | null {
  if (!structureDb) {
    return null;
  }
  switch (structureDb) {
    case "commission_based_fee":
      return "percentage";
    case "fixed_monthly_management_fee":
      return "fixed_monthly";
    case "hybrid_fee_structure":
      return "hybrid";
    default:
      return structureDb;
  }
}

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function trimAddress(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!v) {
    return { ok: false, error: "missing_fields" };
  }
  if (v.length > ADDRESS_PART_MAX) {
    return { ok: false, error: "field_too_long" };
  }
  return { ok: true, value: v };
}

const UNIT_TEXT_MAX = 64;

type UnitDraft = {
  unitNumber: string;
  unitType: string | null;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: Prisma.Decimal | null;
};

function moneyDecimalOrNull(s: string): Prisma.Decimal | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return new Prisma.Decimal(n);
}

function parseOptionalInt(
  v: unknown,
  field: "bedrooms" | "bathrooms"
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (v == null) {
    return { ok: true, value: null };
  }
  if (v === "" || (typeof v === "string" && v.trim() === "")) {
    return { ok: true, value: null };
  }
  const n = typeof v === "number" ? v : Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 20) {
    return { ok: false, error: field === "bedrooms" ? "invalid_unit_bedrooms" : "invalid_unit_bathrooms" };
  }
  return { ok: true, value: n };
}

function parseUnitsJson(raw: string): { ok: true; units: UnitDraft[] } | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: true, units: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "invalid_units_json" };
    }
    const out: UnitDraft[] = [];
    const seen = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const o = row as Record<string, unknown>;
      const num = String(o.unitNumber ?? "").trim();
      if (!num) {
        continue;
      }
      if (num.length > 64) {
        return { ok: false, error: "invalid_unit_number" };
      }
      const key = num.toLowerCase();
      if (seen.has(key)) {
        return { ok: false, error: "duplicate_unit_numbers" };
      }
      seen.add(key);

      const unitTypeRaw = o.unitType != null ? String(o.unitType).trim() : "";
      if (unitTypeRaw.length > UNIT_TEXT_MAX) {
        return { ok: false, error: "invalid_unit_type" };
      }
      const floorRaw = o.floor != null ? String(o.floor).trim() : "";
      if (floorRaw.length > UNIT_TEXT_MAX) {
        return { ok: false, error: "invalid_unit_floor" };
      }

      const br = parseOptionalInt(o.bedrooms, "bedrooms");
      if (!br.ok) {
        return { ok: false, error: br.error };
      }
      const ba = parseOptionalInt(o.bathrooms, "bathrooms");
      if (!ba.ok) {
        return { ok: false, error: ba.error };
      }

      let monthlyRent: Prisma.Decimal | null = null;
      if (o.monthlyRent != null && o.monthlyRent !== "") {
        const rs = typeof o.monthlyRent === "number" ? String(o.monthlyRent) : String(o.monthlyRent);
        const dec = moneyDecimalOrNull(rs);
        if (dec == null) {
          return { ok: false, error: "invalid_unit_rent" };
        }
        monthlyRent = dec;
      }

      out.push({
        unitNumber: num,
        unitType: unitTypeRaw || null,
        floor: floorRaw || null,
        bedrooms: br.value,
        bathrooms: ba.value,
        monthlyRent
      });
    }
    return { ok: true, units: out };
  } catch {
    return { ok: false, error: "invalid_units_json" };
  }
}

/**
 * Guided flow: create building (and optional units), owner account, owner contract, and finance hooks in one transaction.
 */
export async function completeOwnerAgreementWizard(formData: FormData): Promise<OwnerAgreementWizardResult> {
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
  const unitsJson = text(formData, "unitsJson");
  const grantFinancial = text(formData, "ownerFinancialAccess") === "true";

  const buildingName = text(formData, "buildingName");
  const buildingCity = text(formData, "buildingCity");
  const buildingZone = text(formData, "buildingZone");
  const buildingStreet = text(formData, "buildingStreet");
  const buildingNumber = text(formData, "buildingNumber");
  const buildingAreaName = text(formData, "buildingAreaName");
  const buildingNotes = text(formData, "buildingNotes");
  const buildingMapsUrl = text(formData, "buildingMapsUrl");
  const buildingCodeManual = text(formData, "buildingCode");
  const propertyTypeRaw = text(formData, "propertyType").toLowerCase() || "apartment_building";

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

  const explicitPropertyScope = parsePropertyScope(propertyScopeRaw);
  if (!explicitPropertyScope) {
    return { ok: false, error: "missing_property_scope" };
  }
  const ownershipScope = explicitPropertyScope === "specific_units" ? "unit_owner" : "building_owner";

  const parsedUnits = parseUnitsJson(unitsJson);
  if (!parsedUnits.ok) {
    return { ok: false, error: parsedUnits.error };
  }
  const unitDrafts = parsedUnits.units;

  if (ownershipScope === "unit_owner" && unitDrafts.length === 0) {
    return { ok: false, error: "missing_units" };
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

  const PROPERTY_TYPES = new Set([
    "apartment_building",
    "villa",
    "compound",
    "commercial_building",
    "mixed_use"
  ]);
  if (!PROPERTY_TYPES.has(propertyTypeRaw)) {
    return { ok: false, error: "invalid_property_type" };
  }
  if (explicitPropertyScope === "whole_villa" && propertyTypeRaw !== "villa") {
    return { ok: false, error: "invalid_villa_property" };
  }

  const z = trimAddress(buildingZone);
  const s = trimAddress(buildingStreet);
  const b = trimAddress(buildingNumber);
  const city = buildingCity.trim();
  if (!buildingName || !city || !z.ok || !s.ok || !b.ok) {
    return { ok: false, error: "missing_building_fields" };
  }
  if (buildingName.length > 200 || city.length > 120) {
    return { ok: false, error: "field_too_long" };
  }
  const area = buildingAreaName.trim();
  const notes = buildingNotes.trim();
  if (area.length > 200 || notes.length > 2000) {
    return { ok: false, error: "field_too_long" };
  }
  const maps = buildingMapsUrl.trim() || null;
  if (maps && maps.length > 2048) {
    return { ok: false, error: "field_too_long" };
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

  const defaultProfileCt = parseOwnerContractType(defaultProfileContractType);

  let [propertyCols, unitCols, contractCols, profileCols] = await Promise.all([
    getTableColumnSet("properties"),
    getTableColumnSet("units"),
    getTableColumnSet("owner_contracts"),
    getTableColumnSet("owner_profiles")
  ]);

  await ensurePropertyAndUnitUpdatedAtColumns(propertyCols, unitCols);
  await ensureOwnerContractsAndProfileColumns(contractCols, profileCols);

  // Column sets after self-heal DDL (properties, units, owner_contracts, owner_profiles).
  [propertyCols, unitCols, contractCols, profileCols] = await Promise.all([
    getTableColumnSet("properties"),
    getTableColumnSet("units"),
    getTableColumnSet("owner_contracts"),
    getTableColumnSet("owner_profiles")
  ]);

  /** Pre-025 owner_contracts row shape (no property_scope column). Recomputed after self-heal. */
  const legacyOwnerContractFees =
    contractCols.has("management_fee_structure") && !contractCols.has("revenue_calculation_method");
  const legacyOwnerContractTypes = !contractCols.has("property_scope");

  let propertyCode: string;
  if (buildingCodeManual) {
    propertyCode = buildingCodeManual.toUpperCase();
    if (propertyCode.length > 64) {
      return { ok: false, error: "field_too_long" };
    }
    const codeClash = await prisma.property.findUnique({ where: { code: propertyCode }, select: { id: true } });
    if (codeClash) {
      return { ok: false, error: "duplicate_code" };
    }
  } else {
    const allocated = await allocateUniqueBuildingCode(buildingName);
    if (!allocated) {
      return { ok: false, error: "code_alloc_failed" };
    }
    propertyCode = allocated;
  }

  try {
    const { userId, propertyId } = await prisma.$transaction(
      async (tx) => {
        const code = propertyCode;

        const propertyCreate: Prisma.PropertyUncheckedCreateInput = {
        code,
        name: buildingName.trim(),
        addressZone: z.value,
        addressStreet: s.value,
        addressBuildingNumber: b.value,
        addressAreaName: area || null,
        addressNotes: notes || null,
        city,
        country: "Qatar",
        ownerUserId: null,
        ownerContractType: "managed",
        ownerFinancialAccess: false
      };
      if (propertyCols.has("google_maps_url")) {
        propertyCreate.googleMapsUrl = maps;
      }
      if (propertyCols.has("property_type")) {
        propertyCreate.propertyType = propertyTypeRaw;
      }
      if (propertyCols.has("management_status")) {
        propertyCreate.managementStatus = "managed_by_hestia";
      }

      const propRow = await tx.property.create({
        data: propertyCreate,
        select: { id: true }
      });
      const propertyId = propRow.id;

      const createdIds: string[] = [];
      for (const u of unitDrafts) {
        const unitCreate: Prisma.UnitUncheckedCreateInput = {
          propertyId,
          unitNumber: u.unitNumber,
          status: "available"
        };
        if (unitCols.has("unit_type") && u.unitType != null) {
          unitCreate.unitType = u.unitType;
        }
        if (unitCols.has("floor") && u.floor != null) {
          unitCreate.floor = u.floor;
        }
        if (unitCols.has("bedrooms") && u.bedrooms != null) {
          unitCreate.bedrooms = u.bedrooms;
        }
        if (unitCols.has("bathrooms") && u.bathrooms != null) {
          unitCreate.bathrooms = u.bathrooms;
        }
        if (unitCols.has("monthly_rent") && u.monthlyRent != null) {
          unitCreate.monthlyRent = u.monthlyRent;
        }
        if (unitCols.has("ownership_source")) {
          unitCreate.ownershipSource = "no_owner_contract";
        }
        const row = await tx.unit.create({
          data: unitCreate,
          select: { id: true }
        });
        createdIds.push(row.id);
      }

      const unitIdRawList = ownershipScope === "unit_owner" ? createdIds : [];

      if (ownershipScope === "unit_owner") {
        if (unitIdRawList.length === 0) {
          throw new Error("missing_units");
        }
        const unitsCheck = await tx.unit.findMany({
          where: { id: { in: unitIdRawList } },
          select: { id: true, propertyId: true, ownerUserId: true }
        });
        if (unitsCheck.length !== unitIdRawList.length) {
          throw new Error("invalid_units");
        }
        if (unitsCheck.some((u) => u.propertyId !== propertyId)) {
          throw new Error("unit_property_mismatch");
        }
        if (unitsCheck.some((u) => u.ownerUserId != null)) {
          throw new Error("unit_already_assigned");
        }
      }

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

      const profileData: Prisma.OwnerProfileUncheckedCreateInput = {
        userId: uid,
        ownerType,
        qidNumber: ownerType === "individual" ? qidNumber : null,
        commercialRegistrationNumber: ownerType === "company" ? crNumber : null,
        defaultOwnerContractType: defaultProfileContractType
      };
      if (profileCols.has("ownership_scope")) {
        profileData.ownershipScope = ownershipScope;
      }
      await tx.ownerProfile.create({ data: profileData });

      const managementStatusForProperty =
        ownershipScope === "unit_owner"
          ? buildingManagementStatusRaw.trim().toLowerCase() === "managed_by_hestia"
            ? "managed_by_hestia"
            : "location_only_not_managed"
          : "managed_by_hestia";

      if (ownershipScope === "building_owner") {
        const propUpdate: Prisma.PropertyUpdateInput = {
          owner: { connect: { id: uid } },
          ownerContractType: defaultProfileCt,
          ...(grantFinancial ? { ownerFinancialAccess: true } : {})
        };
        if (propertyCols.has("management_status")) {
          propUpdate.managementStatus = managementStatusForProperty;
        }
        await tx.property.update({
          where: { id: propertyId },
          data: propUpdate
        });
        if (unitCols.has("ownership_source")) {
          await tx.unit.updateMany({
            where: { propertyId, ownerUserId: null },
            data: { ownershipSource: "inherited_from_building_contract" }
          });
        }
      } else {
        const propUpdateLo: Prisma.PropertyUpdateInput = {
          ...(grantFinancial ? { ownerFinancialAccess: true } : {})
        };
        if (propertyCols.has("management_status")) {
          propUpdateLo.managementStatus = managementStatusForProperty;
        }
        await tx.property.update({
          where: { id: propertyId },
          data: propUpdateLo
        });
        const unitStake: Prisma.UnitUncheckedUpdateManyInput = { ownerUserId: uid };
        if (unitCols.has("ownership_source")) {
          unitStake.ownershipSource = "direct_unit_owner_contract";
        }
        await tx.unit.updateMany({
          where: { id: { in: unitIdRawList } },
          data: unitStake
        });
      }

      const appliesToUnitIds =
        ownershipScope === "unit_owner" && unitIdRawList.length > 1 ? unitIdRawList : null;
      const contractUnitId =
        ownershipScope === "unit_owner" && unitIdRawList.length === 1 ? unitIdRawList[0]! : null;

      const contractTypeForDb =
        legacyOwnerContractTypes && (storedContractType === "property_management" || storedContractType === "fixed_lease")
          ? storedContractType === "fixed_lease"
            ? "operator"
            : "managed"
          : storedContractType;

      const feeStructureForDb =
        legacyOwnerContractFees && managementFeeStructureDb
          ? managementFeeStructureForLegacy022Column(managementFeeStructureDb)
          : managementFeeStructureDb;

      const contractCreate: Prisma.OwnerContractUncheckedCreateInput = {
        ownerUserId: uid,
        propertyId,
        unitId: contractUnitId,
        contractType: contractTypeForDb,
        startDate: start,
        endDate: end,
        paymentFrequency: "monthly",
        amount: monthAmount,
        documentUrl: null,
        notes: "Initial owner agreement (wizard)"
      };
      if (contractCols.has("property_scope")) {
        contractCreate.propertyScope = explicitPropertyScope;
      }
      if (contractCols.has("contract_status")) {
        contractCreate.contractStatus = computeContractLifecycleStatus(start, end);
      }
      if (contractCols.has("management_fee_structure")) {
        contractCreate.managementFeeStructure = feeStructureForDb;
      }
      if (contractCols.has("management_fee_percentage")) {
        contractCreate.managementFeePercentage = managementFeePercentage;
      }
      if (contractCols.has("monthly_management_fee_amount")) {
        contractCreate.monthlyManagementFeeAmount = monthlyManagementFeeAmount;
      }
      if (contractCols.has("revenue_calculation_method")) {
        contractCreate.revenueCalculationMethod = revenueCalculationMethodDb;
      }
      if (contractCols.has("applies_to_unit_ids") && appliesToUnitIds) {
        contractCreate.appliesToUnitIds = appliesToUnitIds;
      }

      const contract = await tx.ownerContract.create({
        data: contractCreate,
        select: { id: true }
      });

      if (needsExpenseSchedule) {
        if (months.length === 0) {
          throw new Error("no_schedule");
        }
        if (months.length > 600) {
          throw new Error("schedule_too_long");
        }
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
        const pmFixedRowsPerMonth =
          ownershipScope === "unit_owner" && unitIdRawList.length > 1
            ? unitIdRawList.length
            : ownershipScope === "unit_owner" && unitIdRawList.length === 1
              ? 1
              : 1;
        if (months.length === 0 || months.length > 600 || months.length * pmFixedRowsPerMonth > 50_000) {
          throw new Error("schedule_too_long");
        }
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

      return { userId: uid, propertyId };
    },
    { maxWait: 10_000, timeout: 120_000 }
    );

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

    return { ok: true, userId, propertyId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "email_in_use" };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = typeof e.meta === "object" && e.meta && "message" in e.meta ? String((e.meta as { message?: string }).message) : "";
      const detail = [e.code, e.message, meta].filter(Boolean).join(" — ").slice(0, 500);
      return { ok: false, error: "prisma_known", detail };
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      return { ok: false, error: "prisma_validation", detail: e.message.slice(0, 500) };
    }
    if (e instanceof Error) {
      const m = e.message;
      if (
        m === "duplicate_code" ||
        m === "code_alloc_failed" ||
        m === "missing_units" ||
        m === "invalid_units" ||
        m === "unit_property_mismatch" ||
        m === "unit_already_assigned" ||
        m === "insert_failed" ||
        m === "no_schedule" ||
        m === "schedule_too_long" ||
        m === "field_too_long"
      ) {
        return { ok: false, error: m };
      }
      return { ok: false, error: "unexpected", detail: m.slice(0, 500) };
    }
    return { ok: false, error: "unexpected", detail: String(e).slice(0, 500) };
  }
}
