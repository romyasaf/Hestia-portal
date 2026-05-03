import Link from "next/link";
import { listUnitsForAdmin } from "@/server/queries/admin-entities";

export default async function AdminUnitsPage() {
  const units = await listUnitsForAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/portfolio?tab=units" className="font-medium text-primary hover:underline">
              Portfolio · Units
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Units</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Units belong to a building; optional direct unit owner overrides building-level owner.
          </p>
        </div>
        <Link
          href="/admin/units/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New unit
        </Link>
      </header>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">No units yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/units/${u.id}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {u.listingCoverImageUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin URLs + local uploads
                    <img
                      src={u.listingCoverImageUrl.trim()}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No cover image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {u.property.code} · {u.property.name}
                  </p>
                  <p className="text-lg font-semibold tracking-tight">Unit {u.unitNumber}</p>
                  {u.listingTitle?.trim() ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{u.listingTitle.trim()}</p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                      {u.status}
                    </span>
                    <span className="font-medium text-primary">Open →</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
