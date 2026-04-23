import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { TenantAccountInquiryForm } from "@/components/tenant/tenant-account-inquiry-form";
import { requireSession } from "@/server/auth/session";
import { getTenantPortalContext } from "@/server/queries/tenant-portal-context";

export default async function TenantAccountPage() {
  const session = await requireSession();
  const ctx = await getTenantPortalContext(session.user.id);
  if (ctx.mode === "onboarding") {
    redirect("/tenant/onboarding");
  }
  if (ctx.mode === "active") {
    redirect("/tenant/dashboard");
  }

  return (
    <>
      <PortalShell kind="tenant" title="Your account">
        <p className="text-sm text-muted-foreground">
          You do not have an active lease right now. Review past leases below, browse listings, or send a new lease
          inquiry.
        </p>
      </PortalShell>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Previous leases</h2>
          {ctx.pastLeases.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No previous leases on file.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {ctx.pastLeases.map((l) => (
                <li key={l.leaseId} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {l.propertyCode} · {l.propertyName} · Unit {l.unitNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.startDate} → {l.endDate} · {l.status}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">Rent {l.rentAmount}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Find your next home</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse published apartments on the marketing site, or open the inquiry form.
          </p>
          <p className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/listings" className="font-medium text-primary hover:underline">
              Available apartments
            </Link>
            <Link href="/inquire?type=tenant" className="font-medium text-primary hover:underline">
              New lease inquiry (public form)
            </Link>
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Message the leasing team</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Logged-in inquiry — we attach your account email to the message.
          </p>
          <div className="mt-4">
            <TenantAccountInquiryForm />
          </div>
        </section>
      </div>
    </>
  );
}
