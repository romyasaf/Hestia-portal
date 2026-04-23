import Link from "next/link";
import { AdminTenantForm } from "@/components/admin/admin-tenant-form";

export default function AdminNewTenantPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/tenants" className="text-primary hover:underline">
          ← Tenants
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New tenant user</h1>
      <AdminTenantForm />
    </div>
  );
}
