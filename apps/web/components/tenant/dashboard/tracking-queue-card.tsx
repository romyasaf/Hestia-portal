import Link from "next/link";
import type { TenantActionItem } from "@/server/queries/tenant-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  items: TenantActionItem[];
  className?: string;
};

/** In-progress work where admin or staff is the primary actor (FYI, not “must act now”). */
export function TrackingQueueCard({ items, className }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className
      )}
      aria-labelledby="tracking-queue-heading"
    >
      <h2 id="tracking-queue-heading" className="text-base font-semibold tracking-tight sm:text-lg">
        In progress
      </h2>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
        Open maintenance and requests where the office or staff is driving the next step. No action needed from you
        right now unless you want to check details.
      </p>
      <ul className="mt-4 divide-y divide-border">
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
