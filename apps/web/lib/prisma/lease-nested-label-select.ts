import type { Prisma } from "@prisma/client";

/**
 * Nested `lease` reads for list labels and accounting links.
 * Using explicit `select` avoids Prisma fetching Phase-1-only `leases` columns
 * (e.g. `cheque_received_at`) when the database has not run migration 018.
 */
export const leaseNestedForListLabel: Prisma.LeaseSelect = {
  id: true,
  unit: { select: { unitNumber: true } },
  tenant: { select: { fullName: true, email: true } }
};

/** Nested `lease` for validating property scope (no full row fetch). */
export const leaseNestedForUnitProperty: Prisma.LeaseSelect = {
  unit: { select: { propertyId: true } }
};
