import Link from "next/link";
import { AdminLeaseForm } from "@/components/admin/admin-lease-form";
import { listTenantUsersForAdmin, listUnitsForLeaseForm } from "@/server/queries/admin-entities";

export default async function AdminNewLeasePage() {
  const [units, tenants] = await Promise.all([listUnitsForLeaseForm(), listTenantUsersForAdmin()]);
  const tenantOpts = tenants.map((t) => ({
    id: t.id,
    label: `${t.fullName} (${t.email})`
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/leases" className="text-primary hover:underline">
          ← Leases
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New lease</h1>
      <AdminLeaseForm units={units} tenants={tenantOpts} />
    </div>
  );
}
