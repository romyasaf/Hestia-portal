import { prisma } from "@/lib/prisma";
import { TENANT_REQUEST_SOURCE_TYPE } from "@/lib/tenant-requests/constants";

export type AdminOperationsHubCounts = {
  maintenanceOpen: number;
  tenantRequestsPending: number;
  checkInsInFlight: number;
  checkoutsOpen: number;
  checkInIssuesUntriaged: number;
};

export async function getAdminOperationsHubCounts(): Promise<AdminOperationsHubCounts> {
  const [
    maintenanceOpen,
    tenantRequestsPending,
    checkInsInFlight,
    checkoutsOpen,
    checkInIssuesUntriaged
  ] = await Promise.all([
    prisma.ticket.count({
      where: {
        NOT: { status: { in: ["Completed", "Cancelled", "Rejected"] } }
      }
    }),
    prisma.job.count({
      where: {
        sourceType: TENANT_REQUEST_SOURCE_TYPE,
        NOT: {
          OR: [
            { status: { equals: "completed", mode: "insensitive" } },
            { status: { equals: "cancelled", mode: "insensitive" } },
            { status: { equals: "rejected", mode: "insensitive" } }
          ]
        }
      }
    }),
    prisma.leaseCheckIn.count({
      where: {
        NOT: {
          status: { in: ["approved", "rejected", "cancelled"], mode: "insensitive" }
        }
      }
    }),
    prisma.leaseCheckOut.count({
      where: {
        NOT: {
          status: { in: ["completed", "cancelled"], mode: "insensitive" }
        }
      }
    }),
    prisma.leaseCheckInIssue.count({
      where: { convertedTicketId: null }
    })
  ]);

  return {
    maintenanceOpen,
    tenantRequestsPending,
    checkInsInFlight,
    checkoutsOpen,
    checkInIssuesUntriaged
  };
}
