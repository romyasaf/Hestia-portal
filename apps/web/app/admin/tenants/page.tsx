import Link from "next/link";
import { tenantTypeLabel, normalizeTenantType } from "@/lib/tenants/constants";
import { listTenantUsersForAdminTable } from "@/server/queries/admin-entities";

export default async function AdminTenantsPage() {
  const tenants = await listTenantUsersForAdminTable();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/portfolio?tab=tenants" className="font-medium text-primary hover:underline">
              Portfolio · Tenants
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">Users with the tenant role.</p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New tenant user
        </Link>
      </header>

      {tenants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tenant users yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{t.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenantTypeLabel(normalizeTenantType(t.tenantProfile?.tenantType))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3">{t.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="text-primary hover:underline">
                      Details
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
