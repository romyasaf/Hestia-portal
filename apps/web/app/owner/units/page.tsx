import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getOwnerPortalNavFlags, listOwnerOccupancy } from "@/server/queries/owner-portal";
import { cn } from "@/lib/utils";

export default async function OwnerUnitsPage() {
  const session = await requireSession();
  const nav = await getOwnerPortalNavFlags(session.user.id);
  if (!nav.showUnitsLeases) {
    redirect("/owner/dashboard");
  }
  const rows = await listOwnerOccupancy(session.user.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Units & occupancy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live unit status across your portfolio.</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No units found for your buildings.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Unit status</th>
                <th className="px-4 py-3 font-medium">Lease</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.unitId} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.propertyCode}</td>
                  <td className="px-4 py-3 font-medium">{r.unitNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.leaseId ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.leaseId ? r.leaseStatus : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.tenantName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
