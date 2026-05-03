import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPropertyEditForm } from "@/components/admin/admin-property-edit-form";
import { listOwnerUsersForSelect } from "@/server/queries/admin-entities";
import { prisma } from "@/lib/prisma";

type Props = { params: { id: string } };

export default async function AdminPropertyEditPage({ params }: Props) {
  const [p, owners] = await Promise.all([
    prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        name: true,
        addressZone: true,
        addressStreet: true,
        addressBuildingNumber: true,
        addressAreaName: true,
        addressNotes: true,
        city: true,
        country: true,
        googleMapsUrl: true,
        ownerUserId: true,
        ownerContractType: true
      }
    }),
    listOwnerUsersForSelect()
  ]);
  if (!p) {
    notFound();
  }

  const ownerOptions = owners.map((u) => ({ id: u.id, label: `${u.fullName} (${u.email})` }));

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/admin/properties" className="font-medium text-primary hover:underline">
          ← Buildings & owner portal
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit building</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {p.code} · name, structured address, optional owner, and maps link in one save.
      </p>
      <AdminPropertyEditForm property={p} ownerOptions={ownerOptions} />
    </div>
  );
}
