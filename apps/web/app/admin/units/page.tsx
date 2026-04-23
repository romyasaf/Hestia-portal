import Link from "next/link";
import { listUnitsForAdmin } from "@/server/queries/admin-entities";

export default async function AdminUnitsPage() {
  const units = await listUnitsForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/portfolio?tab=units" className="font-medium text-primary hover:underline">
              Portfolio · Units
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Units</h1>
          <p className="mt-1 text-sm text-muted-foreground">Units belong to a building; optional direct unit owner overrides building-level owner.</p>
        </div>
        <Link
          href="/admin/units/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New unit
        </Link>
      </header>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">No units yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{u.property.name}</td>
                  <td className="px-4 py-3 font-medium">{u.unitNumber}</td>
                  <td className="px-4 py-3">{u.status}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/units/${u.id}`} className="text-primary hover:underline">
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
