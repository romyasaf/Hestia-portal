import { isAdminLikeRole } from "@/lib/rbac/staff-permissions";
import { requireRoles } from "@/server/auth/session";

type Props = { searchParams?: { notice?: string } };

export default async function StaffProfilePage({ searchParams }: Props) {
  const session = await requireRoles(["staff", "admin", "super_admin"]);
  const roles = session.user.roles ?? [];
  const perms = session.user.staffPermissions ?? [];

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your portal identity (read-only).</p>
      </header>
      {searchParams?.notice === "staff_permission" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          That area is not enabled for your staff login. Ask an administrator to grant the matching permission, or
          use the links in the header you can see.
        </p>
      ) : null}
      <dl className="space-y-4 rounded-xl border border-border bg-card p-6 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{session.user.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
          <dd className="mt-1 font-mono text-xs">{session.user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Roles</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {roles.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              roles.map((r) => (
                <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {r}
                </span>
              ))
            )}
          </dd>
        </div>
        {!isAdminLikeRole(roles) && roles.includes("staff") ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Staff permissions
            </dt>
            <dd className="mt-1 font-mono text-xs text-muted-foreground">
              {perms.length ? perms.join(", ") : "—"}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="text-xs text-muted-foreground">
        To change your name or email, contact an administrator. Password changes can be added here later.
      </p>
    </main>
  );
}
