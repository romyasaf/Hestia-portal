import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTenantForm } from "@/components/admin/admin-tenant-form";
import { prisma } from "@/lib/prisma";

type Props = { params: { id: string } };

export default async function AdminEditTenantPage({ params }: Props) {
  const user = await prisma.user.findFirst({
    where: {
      id: params.id,
      userRoles: { some: { role: { code: "tenant" } } }
    },
    select: { id: true, email: true, fullName: true, phone: true, isActive: true }
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/tenants" className="text-primary hover:underline">
          ← Tenants
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Edit tenant</h1>
      <AdminTenantForm
        userId={user.id}
        initial={{
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? "",
          isActive: user.isActive
        }}
      />
    </div>
  );
}
