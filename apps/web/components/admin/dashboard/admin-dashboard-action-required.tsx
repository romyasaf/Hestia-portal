import Link from "next/link";
import type { AdminActionItem } from "@/server/queries/admin-dashboard";
import type { ActionPriorityBand } from "@/lib/action-required/priority";
import { cn } from "@/lib/utils";

type Props = {
  items: AdminActionItem[];
  /** Count of lead inquiries in `new` — dashboard shows a single CTA, not a full inbox list. */
  newInquiryCount: number;
  className?: string;
};

function priorityTone(p?: ActionPriorityBand): string {
  if (p === "urgent") {
    return "bg-rose-500/90 text-white";
  }
  if (p === "today") {
    return "bg-amber-600/90 text-white";
  }
  if (p === "upcoming") {
    return "bg-slate-500/85 text-white";
  }
  return "bg-muted text-muted-foreground";
}

function priorityLabel(p?: ActionPriorityBand): string {
  if (!p || p === "none") {
    return "Normal";
  }
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function actionCta(item: AdminActionItem): string {
  if (item.kind === "ticket") {
    if (item.status === "Pending Review") {
      return "Assign";
    }
    if (item.status === "Awaiting Admin Review") {
      return "Review";
    }
    return "Review";
  }
  if (item.kind === "request") {
    return "Decide";
  }
  if (item.kind === "checkin_issue") {
    return "Triage";
  }
  if (item.kind === "checkout") {
    return item.scheduleAt ? "Review" : "Schedule";
  }
  return "Open";
}

function groupLabel(kind: AdminActionItem["kind"]): string {
  switch (kind) {
    case "ticket":
      return "Maintenance";
    case "request":
      return "Tenant requests";
    case "checkin_issue":
      return "Check-in issues";
    case "checkout":
      return "Checkouts";
    default:
      return "Other";
  }
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminDashboardActionRequired({ items, newInquiryCount, className }: Props) {
  const groups = new Map<AdminActionItem["kind"], AdminActionItem[]>();
  for (const it of items) {
    const list = groups.get(it.kind) ?? [];
    list.push(it);
    groups.set(it.kind, list);
  }

  const order: AdminActionItem["kind"][] = ["ticket", "request", "checkin_issue", "checkout"];
  const hasAnything = items.length > 0 || newInquiryCount > 0;

  if (!hasAnything) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center",
          className
        )}
        aria-labelledby="dash-action-heading"
      >
        <h2 id="dash-action-heading" className="text-lg font-semibold tracking-tight text-foreground">
          Action required
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Nothing is waiting on admin right now. Operational queues and the lead inbox will surface here when they need a decision.
        </p>
      </section>
    );
  }

  return (
    <section className={cn("space-y-6", className)} aria-labelledby="dash-action-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-action-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Action required
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Triaged by operations domain. Full lead lists stay in Inquiries; deep queues live in Operations.
          </p>
        </div>
      </div>

      {newInquiryCount > 0 ? (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Lead inbox</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {newInquiryCount === 1
                  ? "1 new inquiry awaiting first response."
                  : `${newInquiryCount} new inquiries awaiting first response.`}
              </p>
            </div>
            <Link
              href="/admin/inquiries?status=new"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Open inquiries
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {order.map((kind) => {
          const list = groups.get(kind);
          if (!list?.length) {
            return null;
          }
          return (
            <div
              key={kind}
              className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {groupLabel(kind)}
              </h3>
              <ul className="mt-4 space-y-0 divide-y divide-border/60">
                {list.map((item) => {
                  const when = formatWhen(item.scheduleAt);
                  return (
                    <li key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              priorityTone(item.priority)
                            )}
                          >
                            {priorityLabel(item.priority)}
                          </span>
                          <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {item.status}
                          </span>
                        </div>
                        <p className="font-medium leading-snug text-foreground">{item.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.summary}</p>
                        {when ? (
                          <p className="text-[11px] font-medium text-muted-foreground">Visit / deadline · {when}</p>
                        ) : null}
                      </div>
                      <Link
                        href={item.href}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                      >
                        {actionCta(item)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
