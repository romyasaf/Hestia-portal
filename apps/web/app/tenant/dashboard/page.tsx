import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { ActionQueueCard } from "@/components/tenant/dashboard/action-queue-card";
import { TrackingQueueCard } from "@/components/tenant/dashboard/tracking-queue-card";
import { LeaseSummaryCard } from "@/components/tenant/dashboard/lease-summary-card";
import { RequestsListCard } from "@/components/tenant/dashboard/requests-list-card";
import { TicketsListCard } from "@/components/tenant/dashboard/tickets-list-card";
import { requireSession } from "@/server/auth/session";
import { getTenantDashboardData } from "@/server/queries/tenant-dashboard";
import { getTenantPortalContext } from "@/server/queries/tenant-portal-context";

export default async function TenantDashboard() {
  const session = await requireSession();
  const ctx = await getTenantPortalContext(session.user.id);
  if (ctx.mode === "onboarding") {
    redirect("/tenant/onboarding");
  }
  if (ctx.mode === "inactive") {
    redirect("/tenant/account");
  }
  const data = await getTenantDashboardData(session.user.id);

  return (
    <>
      <PortalShell kind="tenant" title="Dashboard">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
      </PortalShell>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        {!data.lease ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No active lease</p>
            <p className="mt-2">
              We could not find an <strong>active</strong> lease for your account with today&apos;s date between start
              and end. Maintenance and requests are shown only in the context of an active lease.
            </p>
          </div>
        ) : (
          <>
            <LeaseSummaryCard lease={data.lease} />
            <ActionQueueCard items={data.actionItems} />
            <TrackingQueueCard items={data.trackingItems} />
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <TicketsListCard tickets={data.tickets} />
              <RequestsListCard requests={data.requests} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
