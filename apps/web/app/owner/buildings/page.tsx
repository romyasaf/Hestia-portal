import { requireSession } from "@/server/auth/session";
import { listOwnedPropertiesForUser } from "@/server/queries/owner-portal";

export default async function OwnerBuildingsPage() {
  const session = await requireSession();
  const rows = await listOwnedPropertiesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your buildings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buildings where you are recorded as building-level owner, or that contain a unit you own directly.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No buildings assigned.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((p) => (
            <li key={p.id} className="px-4 py-4 text-sm">
              <p className="font-semibold">
                {p.code} · {p.name}
              </p>
              <p className="mt-1 text-muted-foreground">{p.formattedAddress}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Contract: </span>
                {p.ownerContractType === "operator"
                  ? "Operator (fixed lease) — building-level portal only"
                  : p.ownerContractType === "managed"
                    ? "Managed — full portal on this building"
                    : "Managed (direct unit) — full portal for your units"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Owner financials: {p.ownerFinancialAccess ? "enabled" : "disabled"} (set by admin)
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
