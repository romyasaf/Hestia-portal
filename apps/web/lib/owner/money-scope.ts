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

/**
 * Financial aggregates scoped to **specific units** (unit-only ownership).
 * Use instead of {@link ownerPropertyMoneyOrClauses} when the owner does not own the whole building.
 */
export function ownerUnitMoneyOrClauses(unitIds: string[]): {
  receipt: Prisma.ReceiptWhereInput;
  expense: Prisma.ExpenseWhereInput;
} {
  if (unitIds.length === 0) {
    const empty: Prisma.ReceiptWhereInput = { id: { in: [] } };
    return { receipt: empty, expense: { id: { in: [] } } };
  }
  const inUnits = { in: unitIds };
  const leaseOnOwnedUnit = { unit: { id: inUnits } };

  const receipt: Prisma.ReceiptWhereInput = {
    OR: [
      { lease: leaseOnOwnedUnit },
      { ticket: { unitId: inUnits } },
      { leaseCheckout: { lease: leaseOnOwnedUnit } },
      {
        invoice: {
          OR: [{ lease: leaseOnOwnedUnit }, { job: { unitId: inUnits } }]
        }
      }
    ]
  };

  const expense: Prisma.ExpenseWhereInput = {
    OR: [
      { unitId: inUnits },
      { lease: leaseOnOwnedUnit },
      { ticket: { unitId: inUnits } },
      { leaseCheckout: { lease: leaseOnOwnedUnit } },
      { job: { unitId: inUnits } }
    ]
  };

  return { receipt, expense };
}
