import { PortfolioWorkspace, type PortfolioWorkspaceData } from "@/components/admin/portfolio/portfolio-workspace";
import {
  getAdminPortfolioSnapshot,
  getPortfolioExpiringLeases,
  getPortfolioRecentLeases,
  getPortfolioVacantUnits,
  listPortfolioContractRows,
  listPortfolioLeaseRows,
  listPortfolioOwnerRows,
  listPortfolioPropertyRows,
  listPortfolioTenantRows,
  listPortfolioUnitRows,
  listPropertiesForPortfolioFilters,
  parsePortfolioTab,
  type PortfolioContractListFilter,
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
  const unitQ = typeof searchParams.unitQ === "string" ? searchParams.unitQ.slice(0, 120) : undefined;
  const buildingQ =
    typeof searchParams.buildingQ === "string" ? searchParams.buildingQ.slice(0, 120) : undefined;
  const ownerQ = typeof searchParams.ownerQ === "string" ? searchParams.ownerQ.slice(0, 120) : undefined;
  const tenantQ = typeof searchParams.tenantQ === "string" ? searchParams.tenantQ.slice(0, 120) : undefined;
  const leasePropertyId =
    typeof searchParams.leaseProperty === "string" ? searchParams.leaseProperty : undefined;
  const leaseStatus = typeof searchParams.leaseStatus === "string" ? searchParams.leaseStatus : undefined;
  const leaseQ = typeof searchParams.leaseQ === "string" ? searchParams.leaseQ.slice(0, 120) : undefined;
  const contractQ = typeof searchParams.contractQ === "string" ? searchParams.contractQ.slice(0, 120) : undefined;
  const contractPropertyId =
    typeof searchParams.contractProperty === "string" ? searchParams.contractProperty : undefined;

  const occFilter: PortfolioUnitOccupancy =
    unitOccupancy === "occupied" || unitOccupancy === "vacant" ? unitOccupancy : "all";

  const contractFilter: PortfolioContractListFilter = {
    q: contractQ,
    propertyId: contractPropertyId
  };

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
    leaseRows,
    contractRows
  ] = await Promise.all([
    getAdminPortfolioSnapshot(),
    listPropertiesForPortfolioFilters(),
    getPortfolioRecentLeases(6),
    getPortfolioVacantUnits(8),
    getPortfolioExpiringLeases(8),
    listPortfolioPropertyRows({ q: buildingQ }),
    listPortfolioUnitRows({ propertyId: unitPropertyId, occupancy: occFilter, q: unitQ }),
    listPortfolioOwnerRows({ q: ownerQ }),
    listPortfolioTenantRows({ q: tenantQ }),
    listPortfolioLeaseRows({
      propertyId: leasePropertyId,
      status: leaseStatus || undefined,
      q: leaseQ
    }),
    listPortfolioContractRows(contractFilter)
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
    contractRows,
    propertyOptions
  };

  return (
    <PortfolioWorkspace
      tab={tab}
      unitPropertyId={unitPropertyId}
      unitOccupancy={unitOccupancy}
      unitQ={unitQ}
      buildingQ={buildingQ}
      ownerQ={ownerQ}
      tenantQ={tenantQ}
      leasePropertyId={leasePropertyId}
      leaseStatus={leaseStatus}
      leaseQ={leaseQ}
      contractQ={contractQ}
      contractPropertyId={contractPropertyId}
      data={data}
    />
  );
}
