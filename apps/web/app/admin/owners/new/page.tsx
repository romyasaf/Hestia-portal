import Link from "next/link";
import { AdminOwnerForm } from "@/components/admin/admin-owner-form";
import { listBuildingsWithUnitsForOwnerForm } from "@/server/queries/admin-entities";

export default async function AdminNewOwnerPage() {
  const buildings = await listBuildingsWithUnitsForOwnerForm();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/owners" className="text-primary hover:underline">
          ← Owners
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create owner &amp; agreement</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every new owner must have identification and a first owner agreement on file, including a contract
          attachment.
        </p>
      </div>
      <AdminOwnerForm buildings={buildings} />
    </div>
  );
}
