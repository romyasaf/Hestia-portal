import Link from "next/link";
import type { TenantActionItem } from "@/server/queries/tenant-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  items: TenantActionItem[];
  className?: string;
};

export function ActionQueueCard({ items, className }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 sm:p-6",
        className
      )}
      aria-labelledby="action-queue-heading"
    >
      <h2 id="action-queue-heading" className="text-base font-semibold tracking-tight text-amber-950 dark:text-amber-100 sm:text-lg">
        Action required
      </h2>
      <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80 sm:text-sm">
        Items where <strong>you</strong> are expected to approve, schedule, or otherwise move things forward (see PRD
        action-required band for maintenance).
      </p>
      <ul className="mt-4 divide-y divide-amber-200/70 dark:divide-amber-900/40">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{item.summary}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {item.kind === "ticket"
                  ? "Maintenance"
                  : item.kind === "request"
                    ? "Request"
                    : item.kind === "checkin_issue"
                      ? "Check-in"
                      : "Checkout"}{" "}
                · {item.status}
                {item.priority && item.priority !== "none" ? ` · ${item.priority}` : ""}
              </p>
            </div>
            <Link
              href={item.href}
              className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline sm:ml-4"
            >
              View
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
