import type { Prisma } from "@prisma/client";

/**
 * Shared ownership graph for owner financial aggregates (receipts + expenses).
 * Any record linked into one of the owner’s properties via lease/unit, ticket, checkout, invoice, or job counts.
 */
export function ownerPropertyMoneyOrClauses(propertyIds: string[]): {
  receipt: Prisma.ReceiptWhereInput;
  expense: Prisma.ExpenseWhereInput;
} {
  const inProps = { in: propertyIds };
  const leaseUnitProp = { unit: { propertyId: inProps } };
  const checkoutLeaseUnit = { lease: leaseUnitProp };

  const receipt: Prisma.ReceiptWhereInput = {
    OR: [
      { lease: leaseUnitProp },
      { ticket: { propertyId: inProps } },
      { leaseCheckout: checkoutLeaseUnit },
      {
        invoice: {
          OR: [{ lease: leaseUnitProp }, { job: { propertyId: inProps } }]
        }
      }
    ]
  };

  const expense: Prisma.ExpenseWhereInput = {
    OR: [
      { propertyId: inProps },
      { lease: leaseUnitProp },
      { ticket: { propertyId: inProps } },
      { leaseCheckout: checkoutLeaseUnit },
      { job: { propertyId: inProps } }
    ]
  };

  return { receipt, expense };
}
