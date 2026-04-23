import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getOwnerPortalNavFlags, listOwnerLeases } from "@/server/queries/owner-portal";

export default async function OwnerLeasesPage() {
  const session = await requireSession();
  const nav = await getOwnerPortalNavFlags(session.user.id);
  if (!nav.showUnitsLeases) {
    redirect("/owner/dashboard");
  }
  const rows = await listOwnerLeases(session.user.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Leases</h1>
        <p className="mt-1 text-sm text-muted-foreground">Leases on units in buildings you own.</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leases found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((l) => (
                <tr key={l.leaseId} className="hover:bg-muted/20">
                  <td className="px-4 py-3">{l.propertyName}</td>
                  <td className="px-4 py-3 font-medium">{l.unitNumber}</td>
                  <td className="px-4 py-3">
                    <div>{l.tenantName}</div>
                    <div className="text-xs text-muted-foreground">{l.tenantEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.startDate} → {l.endDate}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{l.rentAmount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
