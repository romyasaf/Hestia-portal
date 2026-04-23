import Link from "next/link";
import {
  listProjectJobsForAdmin,
  parseProjectStatusFilter,
  type ProjectStatusFilter
} from "@/server/queries/admin-projects";

const STATUS_OPTIONS: { value: ProjectStatusFilter; label: string }[] = [
  { value: "all", label: "All stages" },
  { value: "inquiry", label: "Inquiry" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" }
];

function pipelineLabel(status: string): string {
  const s = status.toLowerCase();
  if (["draft", "submitted", "inquiry", "pending_review"].includes(s)) {
    return "Inquiry";
  }
  if (["quoted", "under_review"].includes(s)) {
    return "Quoted";
  }
  if (s === "approved") {
    return "Approved";
  }
  if (["in_progress", "scheduled"].includes(s)) {
    return "In progress";
  }
  if (s === "completed") {
    return "Completed";
  }
  return status;
}

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function AdminProjectsPage({ searchParams }: Props) {
  const status = parseProjectStatusFilter(
    typeof searchParams.status === "string" ? searchParams.status : undefined
  );
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 200) : "";
  const rows = await listProjectJobsForAdmin({ status, q }, 120);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/25 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Renovation &amp; contracting</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Jobs that are not portal tenant requests (renewal / transfer / handover). Lead-driven work stays separate
            from the{" "}
            <Link href="/admin/inquiries" className="font-medium text-primary hover:underline">
              Inquiries
            </Link>{" "}
            inbox until it becomes a job record here.
          </p>
        </header>

        <form
          method="get"
          className="mt-10 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        >
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Pipeline stage
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[200px] flex-[2] flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Search
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Job no, title, requester…"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Apply
          </button>
        </form>

        {rows.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No project jobs yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Contracting and renovation jobs appear here when they are created as non–tenant-request jobs (for example
              from a contracting lead or internal project entry).
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/admin/inquiries?type=contracting"
                className="inline-flex h-9 items-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground hover:bg-foreground hover:text-background"
              >
                Contracting inquiries
              </Link>
              <Link
                href="/admin/operations"
                className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Operations
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Stage</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Property</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.id} className="bg-card/80 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.jobNo}
                      </Link>
                      <p className="mt-0.5 text-muted-foreground">{r.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        {pipelineLabel(r.status)}
                        {r.propertyLabel ? ` · ${r.propertyLabel}` : ""}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{pipelineLabel(r.status)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{r.propertyLabel ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
