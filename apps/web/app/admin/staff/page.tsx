import Link from "next/link";
import { listStaffUsersForAdmin } from "@/server/queries/admin-entities";
import {
  isStaffPortalPermission,
  STAFF_PORTAL_PERMISSION_LABELS
} from "@/lib/rbac/staff-permissions";

function formatPermissions(codes: { permissionCode: string }[] | undefined): string {
  if (!codes || codes.length === 0) {
    return "All (legacy — no rows stored)";
  }
  const labels = codes
    .map((c) => c.permissionCode)
    .filter(isStaffPortalPermission)
    .map((c) => STAFF_PORTAL_PERMISSION_LABELS[c]);
  return labels.length ? labels.join(" · ") : codes.map((c) => c.permissionCode).join(" · ");
}

export default async function AdminStaffPage() {
  const staff = await listStaffUsersForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create staff logins and assign portal permissions (dashboard, maintenance, announcements).
          </p>
        </div>
        <Link
          href="/admin/staff/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New staff user
        </Link>
      </header>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff users yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{s.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">{s.isActive ? "Yes" : "No"}</td>
                  <td className="max-w-[280px] px-4 py-3 text-xs text-muted-foreground">
                    {formatPermissions(s.staffPermissionGrants)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/staff/${s.id}`} className="text-primary hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
