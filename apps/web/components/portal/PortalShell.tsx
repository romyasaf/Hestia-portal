import type { ReactNode } from "react";

type PortalKind = "tenant" | "staff" | "admin" | "owner";

const labels: Record<PortalKind, string> = {
  tenant: "Tenant",
  staff: "Staff",
  admin: "Admin",
  owner: "Owner"
};

type Props = {
  kind: PortalKind;
  title: string;
  children?: ReactNode;
};

/** Shared chrome for portal dashboards (expand with nav + user menu later). */
export function PortalShell({ kind, title, children }: Props) {
  return (
    <div className="border-b border-border bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels[kind]} portal</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {children ? <div className="mt-4 text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
