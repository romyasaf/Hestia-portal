import Link from "next/link";
import { cn } from "@/lib/utils";

type QuickAction = { href: string; label: string };

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/admin/inquiries?status=new", label: "Lead inbox" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/finance", label: "Finance" }
];

type Props = {
  userEmail?: string | null;
  className?: string;
};

function todayLine(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

export function AdminDashboardHero({ userEmail, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-8 border-b border-border/60 pb-10 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="min-w-0 max-w-2xl space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Executive</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Dashboard</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          KPIs, decisions waiting on you, and today&apos;s schedule. Deep lists live in each domain module.
        </p>
        <p className="text-xs text-muted-foreground/90 sm:text-sm">
          <span className="font-medium text-foreground/80">{todayLine()}</span>
          {userEmail ? (
            <>
              <span className="mx-2 text-border">·</span>
              <span className="tabular-nums">{userEmail}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex h-9 items-center rounded-full border border-border/80 bg-background/80 px-3.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-foreground/20 hover:bg-muted/50 sm:h-9 sm:px-4 sm:text-[13px]"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
