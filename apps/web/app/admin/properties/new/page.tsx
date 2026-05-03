import Link from "next/link";
import { AdminPropertyForm } from "@/components/admin/admin-property-form";
import { listOwnerUsersForSelect } from "@/server/queries/admin-entities";

export default async function AdminNewPropertyPage() {
  const owners = await listOwnerUsersForSelect();
  const ownerOptions = owners.map((u) => ({ id: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/properties" className="text-primary hover:underline">
          ← Properties
        </Link>
      </p>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New building</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the building and address. Owner is optional; you can add units and leases next.
        </p>
      </header>
      <AdminPropertyForm ownerOptions={ownerOptions} />
    </div>
  );
}
