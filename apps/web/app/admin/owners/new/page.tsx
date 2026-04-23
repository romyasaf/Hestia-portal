import Link from "next/link";
import { AdminOwnerForm } from "@/components/admin/admin-owner-form";
import { listPropertiesForSelect } from "@/server/queries/admin-entities";

export default async function AdminNewOwnerPage() {
  const properties = await listPropertiesForSelect();
  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: `${p.code} · ${p.name}`
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/owners" className="text-primary hover:underline">
          ← Owners
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New owner account</h1>
      <AdminOwnerForm propertyOptions={propertyOptions} />
    </div>
  );
}
