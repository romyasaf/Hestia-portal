import { PortfolioWorkspace, type PortfolioWorkspaceData } from "@/components/admin/portfolio/portfolio-workspace";
import {
  getAdminPortfolioSnapshot,
  getPortfolioExpiringLeases,
  getPortfolioRecentLeases,
  getPortfolioVacantUnits,
  listPortfolioLeaseRows,
  listPortfolioOwnerRows,
  listPortfolioPropertyRows,
  listPortfolioTenantRows,
  listPortfolioUnitRows,
  listPropertiesForPortfolioFilters,
  parsePortfolioTab,
  type PortfolioTab,
  type PortfolioUnitOccupancy
} from "@/server/queries/admin-portfolio";

function parseUnitOccupancy(raw: string | string[] | undefined): PortfolioUnitOccupancy | undefined {
  if (raw === "occupied" || raw === "vacant") {
    return raw;
  }
  if (raw === "all") {
    return "all";
  }
  return undefined;
}

export default async function AdminPortfolioPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tab: PortfolioTab = parsePortfolioTab(searchParams.tab);
  const unitPropertyId = typeof searchParams.property === "string" ? searchParams.property : undefined;
  const unitOccupancy = parseUnitOccupancy(searchParams.occupancy);
  const leasePropertyId =
    typeof searchParams.leaseProperty === "string" ? searchParams.leaseProperty : undefined;
  const leaseStatus = typeof searchParams.leaseStatus === "string" ? searchParams.leaseStatus : undefined;
  const leaseQ = typeof searchParams.leaseQ === "string" ? searchParams.leaseQ.slice(0, 120) : undefined;

  const occFilter: PortfolioUnitOccupancy =
    unitOccupancy === "occupied" || unitOccupancy === "vacant" ? unitOccupancy : "all";

  const [
    snapshot,
    propertyOptions,
    recentLeases,
    vacantUnits,
    expiringLeases,
    propertyRows,
    unitRows,
    ownerRows,
    tenantRows,
    leaseRows
  ] = await Promise.all([
    getAdminPortfolioSnapshot(),
    listPropertiesForPortfolioFilters(),
    getPortfolioRecentLeases(6),
    getPortfolioVacantUnits(8),
    getPortfolioExpiringLeases(8),
    listPortfolioPropertyRows(),
    listPortfolioUnitRows({ propertyId: unitPropertyId, occupancy: occFilter }),
    listPortfolioOwnerRows(),
    listPortfolioTenantRows(),
    listPortfolioLeaseRows({
      propertyId: leasePropertyId,
      status: leaseStatus || undefined,
      q: leaseQ
    })
  ]);

  const data: PortfolioWorkspaceData = {
    snapshot,
    recentLeases,
    vacantUnits,
    expiringLeases,
    propertyRows,
    unitRows,
    ownerRows,
    tenantRows,
    leaseRows,
    propertyOptions
  };

  return (
    <PortfolioWorkspace
      tab={tab}
      unitPropertyId={unitPropertyId}
      unitOccupancy={unitOccupancy}
      leasePropertyId={leasePropertyId}
      leaseStatus={leaseStatus}
      leaseQ={leaseQ}
      data={data}
    />
  );
}
