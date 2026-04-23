import Link from "next/link";
import type { TenantTicketRow } from "@/server/queries/tenant-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  tickets: TenantTicketRow[];
  className?: string;
};

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "closed" || s === "resolved") {
    return "bg-muted text-muted-foreground";
  }
  if (s === "in_progress") {
    return "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
  }
  return "bg-secondary text-secondary-foreground";
}

export function TicketsListCard({ tickets, className }: Props) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6", className)}
      aria-labelledby="tickets-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tickets-heading" className="text-base font-semibold tracking-tight sm:text-lg">
          Maintenance
        </h2>
        <span className="text-xs text-muted-foreground">Your tickets on this unit</span>
      </div>
      {tickets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No maintenance tickets yet for this lease.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tenant/maintenance/${t.id}`}
                className="block rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/50 sm:px-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.ticketNo}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusTone(t.status))}>
                    {t.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.priority}</span>
                </div>
                <p className="mt-1 font-medium text-foreground">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.category} · Opened {new Date(t.openedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
