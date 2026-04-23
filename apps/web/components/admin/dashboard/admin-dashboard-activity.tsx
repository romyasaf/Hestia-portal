import Link from "next/link";
import type { AdminActivityItem } from "@/server/queries/admin-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  items: AdminActivityItem[];
  className?: string;
};

function variantLabel(v: AdminActivityItem["variant"]): string {
  switch (v) {
    case "lease":
      return "Lease";
    case "ticket":
      return "Maintenance";
    case "inquiry":
      return "Inquiry";
    case "request":
      return "Request";
    case "expense":
      return "Expense";
    case "receipt":
      return "Receipt";
    default:
      return "Event";
  }
}

export function AdminDashboardActivity({ items, className }: Props) {
  return (
    <section className={cn("space-y-5", className)} aria-labelledby="dash-activity-heading">
      <div>
        <h2 id="dash-activity-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Recent activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Latest movements across leasing, ops, and finance.</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
          Activity will appear here as the team uses the portal.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-card/60">
          {items.map((item, idx) => (
            <li key={`${item.href}-${item.at}-${idx}`}>
              <Link
                href={item.href}
                className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {variantLabel(item.variant)}
                  </span>
                  <time className="text-[11px] tabular-nums text-muted-foreground" dateTime={item.at}>
                    {new Date(item.at).toLocaleString()}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
