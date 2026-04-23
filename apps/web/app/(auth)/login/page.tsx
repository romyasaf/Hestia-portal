import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-8 py-10">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        {process.env.NODE_ENV !== "production" ? (
          <>
            <Link href="/dev" className="underline underline-offset-4 hover:text-foreground">
              API dev playground
            </Link>
            {" · "}
          </>
        ) : null}
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Home
        </Link>
      </p>
    </div>
  );
}
