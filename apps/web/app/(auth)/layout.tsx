import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <p className="auth-breadcrumb">
        <Link href="/">← Hestia Portal</Link>
      </p>
      {children}
    </div>
  );
}
