import Link from "next/link";
import { AdminUnitForm } from "@/components/admin/admin-unit-form";
import { listBuildingsForUnitForm, listOwnerUsersForSelect } from "@/server/queries/admin-entities";

export default async function AdminNewUnitPage() {
  const [properties, owners] = await Promise.all([listBuildingsForUnitForm(), listOwnerUsersForSelect()]);
  const opts = properties.map((p) => ({
    id: p.id,
    label: p.owner
      ? `${p.code} · ${p.name} · Building owner: ${p.owner.fullName}`
      : `${p.code} · ${p.name} · No building-level owner`
  }));
  const ownerOpts = owners.map((u) => ({ id: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/units" className="text-primary hover:underline">
          ← Units
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New unit</h1>
      <AdminUnitForm properties={opts} ownerOptions={ownerOpts} />
    </div>
  );
}
