import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTenantDetailHeader } from "@/components/admin/admin-tenant-detail-header";
import { AdminTenantForm } from "@/components/admin/admin-tenant-form";
import { AdminTenantProfileForm } from "@/components/admin/admin-tenant-profile-form";
import { normalizeTenantLifecycleStatus, normalizeTenantType } from "@/lib/tenants/constants";
import { getTenantUserForAdminEdit } from "@/server/queries/admin-entities";

type Props = { params: { id: string } };

export default async function AdminTenantDetailPage({ params }: Props) {
  const user = await getTenantUserForAdminEdit(params.id);

  if (!user) {
    notFound();
  }

  const tp = user.tenantProfile;
  const tenantType = normalizeTenantType(tp?.tenantType);
  const tenantLifecycleStatus = normalizeTenantLifecycleStatus(tp?.tenantLifecycleStatus);

  const tenantProfileInitial = {
    tenantType: tp?.tenantType ?? "individual",
    tenantLifecycleStatus: tp?.tenantLifecycleStatus ?? "active",
    whatsAppPhone: tp?.whatsAppPhone ?? "",
    nationality: tp?.nationality ?? "",
    qidNumber: tp?.qidNumber ?? "",
    qidExpiry: tp?.qidExpiry ? tp.qidExpiry.toISOString().slice(0, 10) : "",
    qidPhotoUrl: tp?.qidPhotoUrl ?? "",
    passportNumber: tp?.passportNumber ?? "",
    passportPhotoUrl: tp?.passportPhotoUrl ?? "",
    dateOfBirth: tp?.dateOfBirth ? tp.dateOfBirth.toISOString().slice(0, 10) : "",
    companyName: tp?.companyName ?? "",
    contactPersonName: tp?.contactPersonName ?? "",
    commercialRegistrationNumber: tp?.commercialRegistrationNumber ?? "",
    crDocumentUrl: tp?.crDocumentUrl ?? "",
    companyAddress: tp?.companyAddress ?? "",
    authorizedSignatory: tp?.authorizedSignatory ?? "",
    emergencyContactName: tp?.emergencyContactName ?? "",
    emergencyContactPhone: tp?.emergencyContactPhone ?? "",
    emergencyContactRelationship: tp?.emergencyContactRelationship ?? ""
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/tenants" className="text-primary hover:underline">
          ← Tenants
        </Link>
      </p>

      <AdminTenantDetailHeader
        userId={user.id}
        email={user.email}
        fullName={user.fullName}
        phone={user.phone}
        isActive={user.isActive}
        tenantType={tenantType}
        tenantLifecycleStatus={tenantLifecycleStatus}
        companyName={tp?.companyName ?? null}
        contactPersonName={tp?.contactPersonName ?? null}
        leases={user.leasesAsTenant}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <AdminTenantForm
          userId={user.id}
          initial={{
            email: user.email,
            fullName: user.fullName,
            phone: user.phone ?? "",
            isActive: user.isActive
          }}
        />
        <AdminTenantProfileForm tenantUserId={user.id} initial={tenantProfileInitial} />
      </div>
    </div>
  );
}
