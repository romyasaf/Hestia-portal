import Link from "next/link";
import {
  ADMIN_TENANT_REQUEST_KIND_OPTIONS,
  ADMIN_TENANT_REQUEST_STATUS_OPTIONS,
  listTenantRequestsForAdmin,
  parseAdminTenantRequestListParams
} from "@/server/queries/tenant-requests";
import {
  isTerminalTenantRequestStatus,
  tenantRequestKindLabel,
  tenantRequestStatusLabel
} from "@/lib/tenant-requests/statuses";
import { cn } from "@/lib/utils";

export default async function AdminTenantRequestsPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseAdminTenantRequestListParams(searchParams);
  const rows = await listTenantRequestsForAdmin(filters);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review renewal, transfer, and handover requests. Open the row to change status.
        </p>
      </header>

      <form method="get" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type
          <select
            name="kind"
            defaultValue={filters.kind}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {ADMIN_TENANT_REQUEST_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select
            name="status"
            defaultValue={filters.status}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {ADMIN_TENANT_REQUEST_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-[2] flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Title, number, requester…"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
          <Link
            href="/admin/requests"
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted/50"
          >
            Reset
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requester</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "hover:bg-muted/30",
                    (r.status === "submitted" || r.status === "under_review") &&
                      !isTerminalTenantRequestStatus(r.status) &&
                      "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/requests/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.jobNo}
                    </Link>
                    <div className="text-muted-foreground">{r.title}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tenantRequestKindLabel(r.requestKind)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        isTerminalTenantRequestStatus(r.status)
                          ? "bg-muted text-muted-foreground"
                          : r.status === "submitted" || r.status === "under_review"
                            ? "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                            : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {tenantRequestStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{r.requesterName}</div>
                    <div className="text-xs">{r.requesterEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.propertyLabel ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
