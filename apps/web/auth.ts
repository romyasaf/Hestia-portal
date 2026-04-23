import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Prisma } from "@prisma/client";
import {
  allStaffPortalPermissions,
  isAdminLikeRole,
  isStaffPortalPermission
} from "@/lib/rbac/staff-permissions";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        const email =
          typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : undefined;
        if (!email || typeof password !== "string") {
          return null;
        }

        const verified = await prisma.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            SELECT id
            FROM users
            WHERE email = ${email}
              AND is_active = true
              AND password_hash = crypt(${password}, password_hash)
            LIMIT 1
          `
        );

        const userId = verified[0]?.id;
        if (!userId) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: {
              include: { role: true }
            }
          }
        });

        if (!user) {
          return null;
        }

        const roles = user.userRoles.map((ur) => ur.role.code);

        let staffPermissions: string[] = [];
        if (isAdminLikeRole(roles)) {
          staffPermissions = allStaffPortalPermissions();
        } else if (roles.includes("staff")) {
          const rows = await prisma.staffPermissionGrant.findMany({
            where: { userId: user.id },
            select: { permissionCode: true }
          });
          const all = allStaffPortalPermissions();
          if (rows.length === 0) {
            staffPermissions = all;
          } else {
            const matched = all.filter((code) => rows.some((r) => r.permissionCode === code));
            staffPermissions = matched;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          roles,
          staffPermissions
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.roles = user.roles;
        // Comma list survives Edge `getToken` better than some array serializations.
        token.roleList = user.roles.join(",");
        const perms = (user as { staffPermissions?: string[] }).staffPermissions ?? [];
        token.staffPermList = perms.filter((c) => isStaffPortalPermission(c)).join(",");
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        const roles = (token.roles as string[] | undefined) ?? [];
        session.user.roles = roles;
        const rawStaffPermList = token.staffPermList;
        if (isAdminLikeRole(roles)) {
          session.user.staffPermissions = allStaffPortalPermissions();
        } else if (roles.includes("staff")) {
          if (typeof rawStaffPermList === "string") {
            session.user.staffPermissions =
              rawStaffPermList.length > 0
                ? rawStaffPermList.split(",").filter((c) => isStaffPortalPermission(c))
                : [];
          } else {
            session.user.staffPermissions = allStaffPortalPermissions();
          }
        } else {
          session.user.staffPermissions = [];
        }
      }
      return session;
    }
  }
});
