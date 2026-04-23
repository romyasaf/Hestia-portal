import Link from "next/link";
import type { TenantPortalContext } from "@/server/queries/tenant-portal-context";

export function TenantPortalNav({ ctx }: { ctx: TenantPortalContext }) {
  if (ctx.mode === "onboarding") {
    return (
      <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Tenant onboarding">
        <Link href="/tenant/onboarding">Move-in steps</Link>
        <Link href="/tenant/onboarding/contract">Contract</Link>
        <Link href="/tenant/onboarding/cheques">Cheques</Link>
        <Link href="/tenant/onboarding/check-in">Check-in</Link>
        <Link href="/tenant/profile">Profile</Link>
        <Link href="/listings">Available apartments</Link>
        <Link href="/">Marketing site</Link>
      </nav>
    );
  }

  if (ctx.mode === "inactive") {
    return (
      <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Tenant account">
        <Link href="/tenant/account">Home</Link>
        <Link href="/tenant/profile">Profile</Link>
        <Link href="/listings">Available apartments</Link>
        <Link href="/inquire?type=tenant">New lease inquiry</Link>
        <Link href="/">Marketing site</Link>
      </nav>
    );
  }

  return (
    <nav className="portal-nav flex flex-wrap items-center gap-4" aria-label="Tenant">
      <Link href="/tenant/dashboard">Home</Link>
      <Link href="/tenant/my-lease">My lease</Link>
      <Link href="/tenant/my-unit">My unit</Link>
      <Link href="/tenant/profile">Profile</Link>
      <Link href="/tenant/requests">Requests</Link>
      <Link href="/tenant/maintenance">Maintenance</Link>
      <Link href="/tenant/checkin">Check-in history</Link>
      <Link href="/tenant/checkout">Checkout</Link>
      <Link href="/tenant/receipts">Receipts</Link>
      <Link href="/tenant/announcements">Announcements</Link>
      <Link href="/listings">Browse listings</Link>
      <Link href="/">Marketing site</Link>
    </nav>
  );
}

export function tenantPortalHomeHref(ctx: TenantPortalContext): string {
  if (ctx.mode === "onboarding") {
    return "/tenant/onboarding";
  }
  if (ctx.mode === "inactive") {
    return "/tenant/account";
  }
  return "/tenant/dashboard";
}
