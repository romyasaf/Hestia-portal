import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOwnerContractsPanel } from "@/components/admin/admin-owner-contracts-panel";
import { AdminOwnerEditForm } from "@/components/admin/admin-owner-edit-form";
import { AdminOwnerProfileForm } from "@/components/admin/admin-owner-profile-form";
import { parseOwnerContractType } from "@/lib/owner/contract";
import { getOwnerUserForAdminEdit } from "@/server/queries/admin-entities";
import {
  getOwnerContractObligationSummary,
  getOwnerPortfolioForContracts,
  listOverdueOwnerContractExpenses,
  listOwnerContractsForAdmin,
  listUpcomingOwnerContractExpenses
} from "@/server/queries/admin-owner-contracts";

type Props = { params: { id: string } };

export default async function AdminEditOwnerPage({ params }: Props) {
  const user = await getOwnerUserForAdminEdit(params.id);
  if (!user) {
    notFound();
  }

  const op = user.ownerProfile;
  const ownerProfileInitial = {
    ownerType: op?.ownerType ?? "individual",
    whatsAppPhone: op?.whatsAppPhone ?? "",
    addressLine: op?.addressLine ?? "",
    notes: op?.notes ?? "",
    qidNumber: op?.qidNumber ?? "",
    qidExpiry: op?.qidExpiry ? op.qidExpiry.toISOString().slice(0, 10) : "",
    qidPhotoUrl: op?.qidPhotoUrl ?? "",
    commercialRegistrationNumber: op?.commercialRegistrationNumber ?? "",
    crDocumentUrl: op?.crDocumentUrl ?? "",
    defaultOwnerContractType: parseOwnerContractType(op?.defaultOwnerContractType ?? "managed"),
    ownershipScope: op?.ownershipScope ?? "building_owner"
  };

  const [contracts, portfolio, obligationSummary, upcoming, overdue] = await Promise.all([
    listOwnerContractsForAdmin(user.id),
    getOwnerPortfolioForContracts(user.id),
    getOwnerContractObligationSummary(user.id),
    listUpcomingOwnerContractExpenses(user.id, 24),
    listOverdueOwnerContractExpenses(user.id, 24)
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/owners" className="text-primary hover:underline">
          ← Owners
        </Link>
        {" · "}
        <Link href="/admin/portfolio?tab=owners" className="text-primary hover:underline">
          Portfolio
        </Link>
      </p>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Owner profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user.fullName} · {user.email}
        </p>
      </header>

      <AdminOwnerEditForm
        userId={user.id}
        initial={{
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? "",
          isActive: user.isActive
        }}
      />

      <AdminOwnerProfileForm ownerUserId={user.id} initial={ownerProfileInitial} />

      <AdminOwnerContractsPanel
        ownerUserId={user.id}
        contracts={contracts}
        portfolio={portfolio}
        obligationSummary={obligationSummary}
        upcoming={upcoming}
        overdue={overdue}
      />
    </div>
  );
}
