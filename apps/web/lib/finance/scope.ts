import type { Prisma } from "@prisma/client";

export type FinanceScopeKind = "all" | "building" | "unit" | "tenant";

/** Parsed finance scope from URL (`scope` + `scopeId`). */
export type FinanceScopeDiscriminant =
  | { kind: "all" }
  | { kind: "building"; propertyId: string }
  | { kind: "unit"; unitId: string }
  | { kind: "tenant"; tenantUserId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFinanceScopeFromSearchParams(
  sp: Record<string, string | string[] | undefined>
): FinanceScopeDiscriminant {
  const kindRaw = typeof sp.scope === "string" ? sp.scope.trim().toLowerCase() : "";
  const idRaw = typeof sp.scopeId === "string" ? sp.scopeId.trim() : "";
  if (!idRaw || !UUID_RE.test(idRaw)) {
    return { kind: "all" };
  }
  if (kindRaw === "building" || kindRaw === "property") {
    return { kind: "building", propertyId: idRaw };
  }
  if (kindRaw === "unit") {
    return { kind: "unit", unitId: idRaw };
  }
  if (kindRaw === "tenant") {
    return { kind: "tenant", tenantUserId: idRaw };
  }
  return { kind: "all" };
}

/** Extra `where` for receipts (AND with date + voided rules). */
export function receiptScopeWhere(s: FinanceScopeDiscriminant): Prisma.ReceiptWhereInput | undefined {
  if (s.kind === "all") {
    return undefined;
  }
  if (s.kind === "building") {
    const P = s.propertyId;
    return {
      OR: [
        { lease: { unit: { propertyId: P } } },
        { ticket: { propertyId: P } },
        {
          invoice: {
            OR: [
              { lease: { unit: { propertyId: P } } },
              { job: { OR: [{ propertyId: P }, { unit: { propertyId: P } }] } }
            ]
          }
        },
        { leaseCheckout: { lease: { unit: { propertyId: P } } } },
        { ownerContract: { propertyId: P } }
      ]
    };
  }
  if (s.kind === "unit") {
    const U = s.unitId;
    return {
      OR: [
        { lease: { unitId: U } },
        { ticket: { OR: [{ unitId: U }, { lease: { unitId: U } }] } },
        {
          invoice: {
            OR: [{ lease: { unitId: U } }, { job: { unitId: U } }]
          }
        },
        { leaseCheckout: { lease: { unitId: U } } },
        { ownerContract: { unitId: U } }
      ]
    };
  }
  const T = s.tenantUserId;
  return {
    OR: [
      { lease: { tenantUserId: T } },
      { invoice: { lease: { tenantUserId: T } } },
      { leaseCheckout: { OR: [{ lease: { tenantUserId: T } }, { tenantUserId: T }] } },
      { ticket: { lease: { tenantUserId: T } } }
    ]
  };
}

/** Extra `where` for expenses (AND with date + voided rules). */
export function expenseScopeWhere(s: FinanceScopeDiscriminant): Prisma.ExpenseWhereInput | undefined {
  if (s.kind === "all") {
    return undefined;
  }
  if (s.kind === "building") {
    const P = s.propertyId;
    return {
      OR: [
        { propertyId: P },
        { unit: { propertyId: P } },
        { lease: { unit: { propertyId: P } } },
        { ticket: { propertyId: P } },
        { job: { OR: [{ propertyId: P }, { unit: { propertyId: P } }] } },
        { leaseCheckout: { lease: { unit: { propertyId: P } } } },
        { ownerContract: { propertyId: P } }
      ]
    };
  }
  if (s.kind === "unit") {
    const U = s.unitId;
    return {
      OR: [
        { unitId: U },
        { lease: { unitId: U } },
        { ticket: { OR: [{ unitId: U }, { lease: { unitId: U } }] } },
        { job: { unitId: U } },
        { leaseCheckout: { lease: { unitId: U } } },
        { ownerContract: { unitId: U } }
      ]
    };
  }
  const T = s.tenantUserId;
  return {
    OR: [
      { lease: { tenantUserId: T } },
      { leaseCheckout: { OR: [{ lease: { tenantUserId: T } }, { tenantUserId: T }] } },
      { ticket: { lease: { tenantUserId: T } } },
      { job: { requesterUserId: T } }
    ]
  };
}

/** Filter invoices (payments / unpaid) by operational anchors. */
export function invoiceScopeWhere(s: FinanceScopeDiscriminant): Prisma.InvoiceWhereInput | undefined {
  if (s.kind === "all") {
    return undefined;
  }
  if (s.kind === "building") {
    const P = s.propertyId;
    return {
      OR: [
        { lease: { unit: { propertyId: P } } },
        { job: { OR: [{ propertyId: P }, { unit: { propertyId: P } }] } }
      ]
    };
  }
  if (s.kind === "unit") {
    const U = s.unitId;
    return {
      OR: [{ lease: { unitId: U } }, { job: { unitId: U } }]
    };
  }
  return {
    OR: [{ lease: { tenantUserId: s.tenantUserId } }, { job: { requesterUserId: s.tenantUserId } }]
  };
}

export function financeScopeQuerySuffix(
  view: "monthly" | "yearly",
  scope: FinanceScopeDiscriminant,
  tab?: string
): string {
  const p = new URLSearchParams();
  p.set("view", view);
  if (tab) {
    p.set("tab", tab);
  }
  if (scope.kind !== "all") {
    p.set("scope", scope.kind);
    const id =
      scope.kind === "building" ? scope.propertyId : scope.kind === "unit" ? scope.unitId : scope.tenantUserId;
    p.set("scopeId", id);
  }
  return p.toString();
}
