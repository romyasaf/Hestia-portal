import type { ActiveLeaseForTenant } from "@/server/queries/leases";

/**
 * Plain-text lease summary for display, print, and download (MVP digital contract step).
 */
export function buildLeaseContractBody(input: {
  lease: ActiveLeaseForTenant;
  tenantFullName: string;
  tenantEmail: string;
}): string {
  const { lease, tenantFullName, tenantEmail } = input;
  const b = lease.building;
  return [
    "RESIDENTIAL LEASE — SUMMARY (Hestia)",
    "",
    `Tenant: ${tenantFullName}`,
    `Email: ${tenantEmail}`,
    "",
    `Property: ${b.name} (${b.code})`,
    `Address: ${b.addressLine1}, ${b.city}, ${b.country}`,
    `Unit: ${lease.unit.unitNumber}`,
    "",
    `Lease term: ${lease.startDate} → ${lease.endDate}`,
    `Monthly rent: ${lease.rentAmount}`,
    `Security deposit: ${lease.depositAmount}`,
    "",
    "By signing electronically below, you acknowledge that you have read this summary and agree to the terms",
    "of your lease as recorded in the office file and any addenda provided separately.",
    "",
    "---",
    "This document is provided for onboarding purposes. Keep a copy for your records."
  ].join("\n");
}
