import { requireSession } from "@/server/auth/session";
import { getAdminActionQueue, getAdminDashboardKpis, getAdminOperationsSnapshot } from "@/server/queries/admin-dashboard";
import { AdminDashboardActionRequired } from "@/components/admin/dashboard/admin-dashboard-action-required";
import { AdminDashboardHero } from "@/components/admin/dashboard/admin-dashboard-hero";
import { AdminDashboardKpiRow } from "@/components/admin/dashboard/admin-dashboard-kpi-row";
import { AdminDashboardToday } from "@/components/admin/dashboard/admin-dashboard-today";

export default async function AdminDashboardPage() {
  const session = await requireSession();

  const [kpis, actionItems, ops] = await Promise.all([
    getAdminDashboardKpis(),
    getAdminActionQueue(14),
    getAdminOperationsSnapshot()
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
        <AdminDashboardHero userEmail={session.user.email} />

        <div className="mt-12 space-y-14 sm:mt-14 sm:space-y-16">
          <AdminDashboardKpiRow kpis={kpis} />

          <AdminDashboardActionRequired items={actionItems} newInquiryCount={kpis.newInquiries} />

          <AdminDashboardToday ops={ops} />
        </div>
      </div>
    </div>
  );
}
