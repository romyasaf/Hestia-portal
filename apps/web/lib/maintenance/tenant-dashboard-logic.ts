import { isTerminalMaintenanceStatus } from "@/lib/maintenance/statuses";
import { isTerminalTenantRequestStatus } from "@/lib/tenant-requests/statuses";

/**
 * Tenant must act: approval of quote/cost, or choosing a schedule slot.
 * "Approved" is an admin/staff handoff state (next transitions are often admin-driven); do not count it here.
 */
export function maintenanceStatusNeedsTenantAction(status: string): boolean {
  switch (status) {
    case "Awaiting Tenant Approval":
    case "Awaiting Scheduling":
      return true;
    default:
      return false;
  }
}

/** Open ticket where someone else (admin/staff) is the primary actor — visibility only. */
export function maintenanceStatusIsOpenTracking(status: string): boolean {
  if (isTerminalMaintenanceStatus(status)) {
    return false;
  }
  return !maintenanceStatusNeedsTenantAction(status);
}

/** Tenant request states where the tenant has a required next step (not yet used in status machine). */
export function tenantRequestStatusNeedsTenantAction(_status: string): boolean {
  return false;
}

/** Non-terminal request the tenant is waiting on ops for (or optional cancel only). */
export function tenantRequestStatusIsOpenTracking(status: string): boolean {
  if (isTerminalTenantRequestStatus(status)) {
    return false;
  }
  return !tenantRequestStatusNeedsTenantAction(status);
}
