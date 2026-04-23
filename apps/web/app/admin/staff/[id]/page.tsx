import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStaffForm } from "@/components/admin/admin-staff-form";
import { prisma } from "@/lib/prisma";

type Props = { params: { id: string } };

export default async function AdminEditStaffPage({ params }: Props) {
  const user = await prisma.user.findFirst({
    where: {
      id: params.id,
      userRoles: { some: { role: { code: "staff" } } }
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      staffPermissionGrants: { select: { permissionCode: true } }
    }
  });

  if (!user) {
    notFound();
  }

  const grantCodes = user.staffPermissionGrants.map((g) => g.permissionCode);
  const initialPermissionCodes = grantCodes.length === 0 ? null : grantCodes;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/staff" className="text-primary hover:underline">
          ← Staff
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Edit staff member</h1>
      <AdminStaffForm
        userId={user.id}
        initial={{
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? "",
          isActive: user.isActive
        }}
        initialPermissionCodes={initialPermissionCodes}
      />
    </div>
  );
}
