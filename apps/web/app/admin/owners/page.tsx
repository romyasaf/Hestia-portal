import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listOwnerUsersForAdmin } from "@/server/queries/admin-entities";

function formatOwnerType(t: string): string {
  return t === "company" ? "Company" : "Individual";
}

export default async function AdminOwnersPage() {
  const owners = await listOwnerUsersForAdmin();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Owners</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Owner accounts can sign in to the owner portal. Status <strong className="text-foreground">Active</strong>{" "}
          means they have an agreement covering today&apos;s date. Assign additional buildings under{" "}
          <Link href="/admin/properties" className="font-medium text-primary hover:underline">
            Buildings
          </Link>
          .
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/owners/new">Create owner &amp; agreement</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/portfolio?tab=owners">View in Portfolio</Link>
        </Button>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm">
        <table className="w-full min-w-[1680px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Property scope</th>
              <th className="px-4 py-3 font-medium">Building / unit</th>
              <th className="px-4 py-3 font-medium">Agreement type</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Fixed lease</th>
              <th className="px-4 py-3 font-medium">Mgmt fee structure</th>
              <th className="px-4 py-3 font-medium">Commission %</th>
              <th className="px-4 py-3 font-medium">Monthly mgmt fee</th>
              <th className="px-4 py-3 font-medium">Revenue basis</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {owners.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-muted-foreground">
                  No owner accounts yet.{" "}
                  <Link href="/admin/owners/new" className="font-medium text-primary hover:underline">
                    Create owner &amp; agreement
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              owners.map((o) => (
                <tr key={o.id} className="hover:bg-muted/25">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{o.fullName}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatOwnerType(o.ownerType)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.phone?.trim() || "—"}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-muted-foreground" title={o.idNumber ?? ""}>
                    {o.idNumber?.trim() || "—"}
                  </td>
                  <td className="max-w-[120px] px-4 py-3 text-xs text-muted-foreground">
                    {o.propertyScopeLabel ?? "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground" title={o.locationSummary ?? ""}>
                    {o.locationSummary ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.contractTypeLabel ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {o.contractStart && o.contractEnd ? (
                      <>
                        {o.contractStart} → {o.contractEnd}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {o.fixedLeaseAmountDisplay ?? "—"}
                  </td>
                  <td className="max-w-[120px] px-4 py-3 text-xs text-muted-foreground">
                    {o.managementFeeStructureLabel ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {o.managementFeePercentageDisplay ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {o.monthlyManagementFeeDisplay ?? "—"}
                  </td>
                  <td className="max-w-[140px] px-4 py-3 text-xs text-muted-foreground">
                    {o.revenueCalculationMethodLabel ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        o.ownerStatus === "Active"
                          ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {o.ownerStatus}
                    </span>
                    {!o.loginActive ? (
                      <span className="ml-1 text-[10px] uppercase text-destructive">Login off</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/owners/${o.id}`} className="font-medium text-primary hover:underline">
                      Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
