import Link from "next/link";
import { utcTodayDateOnly } from "@/lib/units/public-listing";
import { tenantTypeLabel, type TenantLifecycleStatus, type TenantType } from "@/lib/tenants/constants";

type LeaseRow = {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  unit: { unitNumber: string; property: { code: string; name: string } };
};

function lifecycleLabel(s: TenantLifecycleStatus): string {
  switch (s) {
    case "previous":
      return "Previous tenant";
    case "lead_pending":
      return "Lead / pending lease";
    default:
      return "Active tenant";
  }
}

function calendarActiveLeaseToday(leases: LeaseRow[]) {
  const today = utcTodayDateOnly();
  return leases.find((l) => {
    const st = l.status.trim().toLowerCase();
    if (st !== "active") return false;
    return l.startDate <= today && l.endDate >= today;
  });
}

export function AdminTenantDetailHeader({
  userId,
  email,
  fullName,
  phone,
  isActive,
  tenantType,
  tenantLifecycleStatus,
  companyName,
  contactPersonName,
  leases
}: {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  tenantType: TenantType;
  tenantLifecycleStatus: TenantLifecycleStatus;
  companyName: string | null;
  contactPersonName: string | null;
  leases: LeaseRow[];
}) {
  const active = calendarActiveLeaseToday(leases);
  const displayPrimary =
    tenantType === "company"
      ? (companyName?.trim() || fullName)
      : fullName;
  const displaySecondary =
    tenantType === "company" && contactPersonName?.trim()
      ? `Contact: ${contactPersonName.trim()}`
      : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {tenantTypeLabel(tenantType)}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {lifecycleLabel(tenantLifecycleStatus)}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-muted text-muted-foreground"
              }`}
            >
              Account {isActive ? "active" : "inactive"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{displayPrimary}</h1>
          {displaySecondary ? <p className="mt-1 text-sm text-muted-foreground">{displaySecondary}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{email}</span>
            {phone?.trim() ? (
              <>
                {" · "}
                {phone.trim()}
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right text-sm">
          <Link href={`/admin/leases/new`} className="font-medium text-primary hover:underline">
            New lease
          </Link>
          <p className="mt-2 max-w-xs text-xs text-muted-foreground">
            Leases and portal access are unchanged: calendar-active lease still drives tenant operations.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lease snapshot</h2>
        {active ? (
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">Active (today):</span>{" "}
            {active.unit.property.code} · {active.unit.property.name} · Unit {active.unit.unitNumber} ·{" "}
            {active.startDate.toISOString().slice(0, 10)} → {active.endDate.toISOString().slice(0, 10)}
            <Link href={`/admin/leases/${active.id}`} className="ml-2 font-medium text-primary hover:underline">
              Open lease
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No calendar-active lease for today&apos;s date.</p>
        )}
        {leases.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {leases.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link href={`/admin/leases/${l.id}`} className="font-medium text-primary hover:underline">
                  {l.unit.property.code} · Unit {l.unit.unitNumber}
                </Link>{" "}
                · {l.status} · {l.startDate.toISOString().slice(0, 10)} → {l.endDate.toISOString().slice(0, 10)}
              </li>
            ))}
            {leases.length > 5 ? <li>… {leases.length} total</li> : null}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No leases yet.</p>
        )}
      </div>
    </section>
  );
}
