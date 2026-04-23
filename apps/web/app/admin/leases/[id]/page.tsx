import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLeaseChequePanel } from "@/components/admin/admin-lease-cheque-panel";
import { AdminLeaseForm } from "@/components/admin/admin-lease-form";
import { getLeaseForAdminEdit, listTenantUsersForAdmin, listUnitsForLeaseForm } from "@/server/queries/admin-entities";

type Props = { params: { id: string } };

export default async function AdminEditLeasePage({ params }: Props) {
  const lease = await getLeaseForAdminEdit(params.id);

  if (!lease) {
    notFound();
  }

  const [units, tenants] = await Promise.all([listUnitsForLeaseForm(), listTenantUsersForAdmin()]);
  const tenantOpts = tenants.map((t) => ({
    id: t.id,
    label: `${t.fullName} (${t.email})`
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/leases" className="text-primary hover:underline">
          ← Leases
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Edit lease</h1>
      <AdminLeaseForm
        leaseId={lease.id}
        units={units}
        tenants={tenantOpts}
        initial={{
          unitId: lease.unitId,
          tenantUserId: lease.tenantUserId,
          startDate: lease.startDate.toISOString().slice(0, 10),
          endDate: lease.endDate.toISOString().slice(0, 10),
          rentAmount: lease.rentAmount.toString(),
          depositAmount: lease.depositAmount.toString(),
          status: lease.status
        }}
      />
      <AdminLeaseChequePanel
        leaseId={lease.id}
        chequeDeliveryState={lease.chequeDeliveryState}
        chequeMarkedDeliveredAt={lease.chequeMarkedDeliveredAt?.toISOString() ?? null}
        chequeApprovedAt={lease.chequeApprovedAt?.toISOString() ?? null}
        onboardingCompletedAt={lease.onboardingCompletedAt?.toISOString() ?? null}
      />
    </div>
  );
}
