import Link from "next/link";
import type { AdminDashboardKpis } from "@/server/queries/admin-dashboard";
import { formatDashboardMoney } from "@/server/queries/admin-dashboard";
import { cn } from "@/lib/utils";

type Props = {
  kpis: AdminDashboardKpis;
  className?: string;
};

type KpiDef = {
  label: string;
  value: string;
  hint: string;
  href: string;
  emphasize?: boolean;
};

export function AdminDashboardKpiRow({ kpis, className }: Props) {
  const cards: KpiDef[] = [
    {
      label: "Active leases",
      value: String(kpis.activeLeases),
      hint: "Calendar-active today",
      href: "/admin/leases"
    },
    {
      label: "Available units",
      value: String(kpis.availableUnits),
      hint: "Vacant inventory",
      href: "/admin/units"
    },
    {
      label: "Open maintenance",
      value: String(kpis.openMaintenanceTickets),
      hint: "Non-terminal tickets",
      href: "/admin/operations",
      emphasize: kpis.openMaintenanceTickets > 0
    },
    {
      label: "Requests pending",
      value: String(kpis.requestsPending),
      hint: "Tenant renewals & moves",
      href: "/admin/operations",
      emphasize: kpis.requestsPending > 0
    },
    {
      label: "New inquiries",
      value: String(kpis.newInquiries),
      hint: "Public lead inbox",
      href: "/admin/inquiries?status=new",
      emphasize: kpis.newInquiries > 0
    },
    {
      label: "This month",
      value: formatDashboardMoney(kpis.receiptsMonthTotal),
      hint: `Spend ${formatDashboardMoney(kpis.expensesMonthTotal)} · Unpaid invoices ${kpis.unpaidInvoices}`,
      href: "/admin/finance",
      emphasize: kpis.unpaidInvoices > 0
    }
  ];

  return (
    <section aria-label="Key metrics" className={cn(className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn(
              "group flex flex-col rounded-2xl border p-5 transition-all duration-200",
              "border-border/70 bg-card/80 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-sm",
              "hover:border-foreground/12 hover:shadow-md dark:shadow-none dark:hover:bg-card",
              c.emphasize && "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.75rem]">
              {c.value}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground group-hover:text-muted-foreground/90">
              {c.hint}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
