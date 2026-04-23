import { requireSession } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";
import { TenantProfileForm } from "@/components/tenant/tenant-profile-form";

export default async function TenantProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, email: true, phone: true }
  });

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update the name and phone we use for your account.</p>
      </header>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
        <p className="mt-1 font-mono text-xs">{user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">Email sign-in is managed by your administrator. To change it, contact the office.</p>
      </div>

      <TenantProfileForm initialFullName={user.fullName} initialPhone={user.phone} />
    </div>
  );
}
