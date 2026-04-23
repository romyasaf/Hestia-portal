import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProjectJobById } from "@/server/queries/admin-projects";

type Props = { params: { id: string } };

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

export default async function AdminProjectDetailPage({ params }: Props) {
  const row = await getAdminProjectJobById(params.id);
  if (!row) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <p>
        <Link href="/admin/projects" className="text-sm font-medium text-primary hover:underline">
          ← All projects
        </Link>
      </p>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{row.jobNo}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {pipelineLabel(row.status)}
          </span>
          <span className="text-xs text-muted-foreground">Source · {row.sourceType}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{row.title}</h1>
        <p className="text-sm text-muted-foreground">
          {row.requesterName} ({row.requesterEmail})
        </p>
        <p className="text-sm text-muted-foreground">
          Created {new Date(row.createdAt).toLocaleString()}
          {row.scheduledAt ? <> · Scheduled {new Date(row.scheduledAt).toLocaleString()}</> : null}
          {row.propertyLabel ? (
            <>
              {" "}
              · {row.propertyLabel}
            </>
          ) : null}
        </p>
      </header>

      {row.scope ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Scope &amp; notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.scope}</p>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Status changes for contracting jobs can be wired to dedicated actions when your workflow is finalized. Tenant
        portal requests remain under{" "}
        <Link href="/admin/requests" className="font-medium text-primary hover:underline">
          Operations → Tenant requests
        </Link>
        .
      </p>
    </div>
  );
}
