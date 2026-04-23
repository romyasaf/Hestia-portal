import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminOwnersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Owners</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Owner accounts are users with the <strong className="text-foreground">owner</strong> role. After you create
          one, assign building-level ownership in{" "}
          <Link href="/admin/properties" className="font-medium text-primary hover:underline">
            Buildings &amp; owner portal
          </Link>{" "}
          or set a direct owner on specific units.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/owners/new">Create owner account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/portfolio?tab=owners">View in Portfolio</Link>
        </Button>
      </div>
    </div>
  );
}
