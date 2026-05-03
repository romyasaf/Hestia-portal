import type { Prisma } from "@prisma/client";

/**
 * Legacy scope helper for operator buildings (building-level expenses without tenant lease).
 * Owner portal KPIs now use **owner contracts** (`owner_payment` + `OwnerContract`) instead; see
 * `getOwnerFinancialSummary` in `server/queries/owner-portal.ts`. Kept for ad-hoc reporting if needed.
 */
export function ownerOperatorMoneyClauses(propertyIds: string[]): {
  receipt: Prisma.ReceiptWhereInput;
  expense: Prisma.ExpenseWhereInput;
} {
  if (propertyIds.length === 0) {
    const empty: Prisma.ReceiptWhereInput = { id: { in: [] } };
    return { receipt: empty, expense: { id: { in: [] } } };
  }
  const inProps = { in: propertyIds };

  const expense: Prisma.ExpenseWhereInput = {
    OR: [
      {
        AND: [{ propertyId: inProps }, { unitId: null }, { leaseId: null }]
      },
      { ticket: { propertyId: inProps, unitId: null } },
      { job: { propertyId: inProps } }
    ]
  };

  const receipt: Prisma.ReceiptWhereInput = {
    OR: [
      { ticket: { propertyId: inProps, unitId: null } },
      {
        invoice: {
          leaseId: null,
          job: { propertyId: inProps }
        }
      }
    ]
  };

  return { receipt, expense };
}
