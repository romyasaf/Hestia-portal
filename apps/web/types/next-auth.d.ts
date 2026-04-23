import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roles: string[];
      /** Effective portal permissions for staff (admins get the full set). */
      staffPermissions: string[];
    };
  }

  interface User {
    roles: string[];
    staffPermissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
    /** Comma-separated role codes for Edge `getToken`. */
    roleList?: string;
    /** Comma-separated staff portal permission codes. */
    staffPermList?: string;
  }
}
