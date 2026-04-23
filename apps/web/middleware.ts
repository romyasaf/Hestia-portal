import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessAdminPortal,
  canAccessOwnerPortal,
  canAccessStaffPortal,
  canAccessTenantPortal
} from "@/lib/rbac";

function rolesFromToken(token: Awaited<ReturnType<typeof getToken>>): string[] {
  if (!token || typeof token === "string") {
    return [];
  }
  const list = token.roleList as string | undefined;
  if (typeof list === "string" && list.length > 0) {
    return list.split(",").filter(Boolean);
  }
  const raw = token.roles;
  if (Array.isArray(raw)) {
    return raw as string[];
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Edge-safe: JWT via `getToken` (no Prisma). Coarse portal + auth only.
 * Server layouts use `requireRoles()` again for defense in depth.
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const { pathname } = request.nextUrl;

  if (pathname === "/dev" && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/inquiry") {
    const u = request.nextUrl.clone();
    u.pathname = "/inquire";
    const legacyType = u.searchParams.get("type");
    if (legacyType && !u.searchParams.get("inquiryType")) {
      u.searchParams.set("inquiryType", legacyType);
      u.searchParams.delete("type");
    }
    return NextResponse.redirect(u);
  }

  const legacyMarketing = ["/about", "/services", "/properties", "/contact"];
  if (legacyMarketing.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectLogin = (reason?: string) => {
    const url = new URL("/login", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    if (reason) {
      url.searchParams.set("error", reason);
    }
    return NextResponse.redirect(url);
  };

  const isProtected =
    pathname.startsWith("/tenant") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner");

  if (isProtected && !secret) {
    return redirectLogin("config");
  }

  const token = secret ? await getToken({ req: request, secret }) : null;
  const roles = rolesFromToken(token);

  if (pathname.startsWith("/tenant")) {
    if (!token?.sub) {
      return redirectLogin();
    }
    if (!canAccessTenantPortal(roles)) {
      return redirectLogin("access");
    }
  }

  if (pathname.startsWith("/staff")) {
    if (!token?.sub) {
      return redirectLogin();
    }
    if (!canAccessStaffPortal(roles)) {
      return redirectLogin("access");
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!token?.sub) {
      return redirectLogin();
    }
    if (!canAccessAdminPortal(roles)) {
      return redirectLogin("access");
    }
    if (pathname === "/admin/buildings") {
      return NextResponse.redirect(new URL("/admin/properties", request.url));
    }
  }

  if (pathname.startsWith("/owner")) {
    if (!token?.sub) {
      return redirectLogin();
    }
    if (!canAccessOwnerPortal(roles)) {
      return redirectLogin("access");
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    "/dev",
    "/inquiry",
    "/about",
    "/services",
    "/properties",
    "/contact",
    "/tenant/:path*",
    "/staff/:path*",
    "/admin/:path*",
    "/owner/:path*"
  ]
};
