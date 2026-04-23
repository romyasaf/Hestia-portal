import Link from "next/link";
import { checkInStatusLabel } from "@/lib/checkin/statuses";
import { isTerminalCheckInStatus } from "@/lib/checkin/statuses";
import { listCheckInsForAdmin } from "@/server/queries/checkin";
import { cn } from "@/lib/utils";

export default async function AdminCheckinsPage() {
  const rows = await listCheckInsForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review tenant move-in submissions and logged issues.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No check-ins yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "hover:bg-muted/30",
                    (r.status === "submitted" || r.status === "under_review") &&
                      !isTerminalCheckInStatus(r.status) &&
                      "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        isTerminalCheckInStatus(r.status)
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
                      )}
                    >
                      {checkInStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/checkins/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.tenantName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.tenantEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.propertyLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.issueCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
