import { Prisma } from "@prisma/client";

/** Stored on `owner_contracts.management_fee_structure` (canonical DB values). */
export const MANAGEMENT_FEE_STRUCTURE_DB = [
  "commission_based_fee",
  "fixed_monthly_management_fee",
  "hybrid_fee_structure"
] as const;
export type ManagementFeeStructureDb = (typeof MANAGEMENT_FEE_STRUCTURE_DB)[number];

/** Internal normalized shape for validation & branching (maps to/from DB strings). */
export const MANAGEMENT_FEE_STRUCTURES = ["percentage", "fixed_monthly", "hybrid"] as const;
export type ManagementFeeStructure = (typeof MANAGEMENT_FEE_STRUCTURES)[number];

/** Stored on `owner_contracts.revenue_calculation_method`. */
export const REVENUE_CALCULATION_METHOD_DB = ["gross_revenue_basis", "net_revenue_basis"] as const;
export type RevenueCalculationMethodDb = (typeof REVENUE_CALCULATION_METHOD_DB)[number];

export const FEE_CALCULATION_BASES = ["before_expenses", "after_expenses"] as const;
export type FeeCalculationBasis = (typeof FEE_CALCULATION_BASES)[number];

export function parseManagementFeeStructure(raw: string | null | undefined): ManagementFeeStructure | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "percentage" || t === "commission_based_fee") {
    return "percentage";
  }
  if (t === "fixed_monthly" || t === "fixed_monthly_management_fee") {
    return "fixed_monthly";
  }
  if (t === "hybrid" || t === "hybrid_fee_structure") {
    return "hybrid";
  }
  return null;
}

export function parseFeeCalculationBasis(raw: string | null | undefined): FeeCalculationBasis | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "before_expenses" || t === "gross_revenue_basis") {
    return "before_expenses";
  }
  if (t === "after_expenses" || t === "net_revenue_basis") {
    return "after_expenses";
  }
  return null;
}

export function managementFeeStructureForDb(s: ManagementFeeStructure): ManagementFeeStructureDb {
  switch (s) {
    case "percentage":
      return "commission_based_fee";
    case "fixed_monthly":
      return "fixed_monthly_management_fee";
    case "hybrid":
      return "hybrid_fee_structure";
    default:
      return "commission_based_fee";
  }
}

export function revenueCalculationMethodForDb(b: FeeCalculationBasis): RevenueCalculationMethodDb {
  return b === "before_expenses" ? "gross_revenue_basis" : "net_revenue_basis";
}

export type ManagementFeeDbFields = {
  managementFeeStructure: ManagementFeeStructure;
  managementFeePercentage: Prisma.Decimal | null;
  monthlyManagementFeeAmount: Prisma.Decimal | null;
  feeCalculationBasis: FeeCalculationBasis;
};

export function validateManagementFeeInput(input: {
  structureRaw: string;
  basisRaw: string;
  percentageRaw: string;
  monthlyRaw: string;
}): { ok: true; data: ManagementFeeDbFields } | { ok: false; error: string } {
  const structure = parseManagementFeeStructure(input.structureRaw);
  const basis = parseFeeCalculationBasis(input.basisRaw);
  if (!structure) {
    return { ok: false, error: "missing_management_fee_structure" };
  }
  if (!basis) {
    return { ok: false, error: "missing_revenue_calculation_method" };
  }

  const pctRaw = input.percentageRaw.trim();
  const monthlyRaw = input.monthlyRaw.trim();
  let pct: Prisma.Decimal | null = null;
  let monthly: Prisma.Decimal | null = null;

  if (structure === "percentage" || structure === "hybrid") {
    const n = Number.parseFloat(pctRaw);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      return { ok: false, error: "invalid_management_percentage" };
    }
    pct = new Prisma.Decimal(n);
  }

  if (structure === "fixed_monthly" || structure === "hybrid") {
    const m = Number.parseFloat(monthlyRaw);
    if (!Number.isFinite(m) || m <= 0) {
      return { ok: false, error: "invalid_monthly_management_fee" };
    }
    monthly = new Prisma.Decimal(m);
  }

  return {
    ok: true,
    data: {
      managementFeeStructure: structure,
      managementFeePercentage: pct,
      monthlyManagementFeeAmount: monthly,
      feeCalculationBasis: basis
    }
  };
}

export function managementFeeStructureLabel(s: string | null | undefined): string {
  switch (parseManagementFeeStructure(s) ?? "") {
    case "percentage":
      return "Commission-Based Fee";
    case "fixed_monthly":
      return "Fixed Monthly Management Fee";
    case "hybrid":
      return "Hybrid Fee Structure";
    default:
      return "—";
  }
}

/** UI label for gross vs net revenue basis (accepts DB or legacy stored values). */
export function feeCalculationBasisLabel(b: string | null | undefined): string {
  switch (parseFeeCalculationBasis(b) ?? "") {
    case "before_expenses":
      return "Gross Revenue Basis";
    case "after_expenses":
      return "Net Revenue Basis";
    default:
      return "—";
  }
}

export const revenueCalculationMethodLabel = feeCalculationBasisLabel;

export function formatPercentageForDisplay(d: { toString(): string } | null | undefined): string {
  if (d == null) {
    return "—";
  }
  const n = Number(d.toString());
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n}%`;
}

export function formatMoneyQarForDisplay(d: { toString(): string } | null | undefined): string {
  if (d == null) {
    return "—";
  }
  const n = Number(d.toString());
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} QAR`;
}
