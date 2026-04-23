import Link from "next/link";
import { AdminStaffForm } from "@/components/admin/admin-staff-form";

export default function AdminNewStaffPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/staff" className="text-primary hover:underline">
          ← Staff
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New staff user</h1>
      <AdminStaffForm />
    </div>
  );
}
