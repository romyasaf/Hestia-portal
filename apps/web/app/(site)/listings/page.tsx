import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { formatFinanceMoney } from "@/lib/finance/format-money";
import { listPublicListingUnits } from "@/server/queries/public-listings";

function isConfiguredRemoteImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

export default async function ListingsPage() {
  const units = await listPublicListingUnits();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <p className="text-sm font-medium text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Available apartments</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Live inventory from our portfolio — each listing is tied to a real unit and updates automatically when it
        becomes vacant and marketing details are complete.
      </p>

      {units.length === 0 ? (
        <div className="mt-14 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No published listings right now. When a unit has no active lease and listing details are complete (including
          at least one gallery image), it appears here automatically.
        </div>
      ) : (
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <li
              key={u.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {isConfiguredRemoteImage(u.coverImageUrl) ? (
                  <Image
                    src={u.coverImageUrl}
                    alt={u.listingTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary HTTPS URLs
                  <img src={u.coverImageUrl} alt={u.listingTitle} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {u.propertyCode} · {u.city}
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{u.listingTitle}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{u.listingDescription}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {u.bedrooms != null ? <span>{u.bedrooms} bed</span> : null}
                  {u.bathrooms != null ? <span>{u.bathrooms} bath</span> : null}
                  {u.unitType ? <span className="capitalize">{u.unitType}</span> : null}
                </div>
                {u.amenities.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {u.amenities.slice(0, 6).map((a) => (
                      <li
                        key={a}
                        className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {a}
                      </li>
                    ))}
                    {u.amenities.length > 6 ? (
                      <li className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                        +{u.amenities.length - 6}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                <p className="mt-4 text-xl font-semibold tabular-nums text-foreground">
                  {formatFinanceMoney(Number(u.displayPrice))}
                  <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Button asChild size="sm" className="font-semibold">
                    <Link href={`/inquire?inquiryType=tenant`}>Inquire</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild variant="outline" size="lg" className="h-12 font-semibold">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
