import Link from "next/link";
import { listLeasesForAdmin } from "@/server/queries/admin-entities";

export default async function AdminLeasesPage() {
  const leases = await listLeasesForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/portfolio?tab=leases" className="font-medium text-primary hover:underline">
              Portfolio · Leases
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Leases</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and edit lease records (unit + tenant + dates).</p>
        </div>
        <Link
          href="/admin/leases/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New lease
        </Link>
      </header>

      {leases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leases yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leases.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {l.unit.property.name} · {l.unit.unitNumber}
                  </td>
                  <td className="px-4 py-3">{l.tenant.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.startDate.toISOString().slice(0, 10)} → {l.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{l.rentAmount.toString()}</td>
                  <td className="px-4 py-3">{l.status}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/leases/${l.id}`} className="text-primary hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
