import type { Prisma } from "@prisma/client";

/**
 * Financial visibility for **operator** (fixed-lease) building owners:
 * building-level expenses and company payments not routed through tenant leases.
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
