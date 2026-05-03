import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminUnitSection = "overview" | "listing" | "visibility" | "checkin";

const SECTIONS: { id: AdminUnitSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "listing", label: "Listing / marketing" },
  { id: "checkin", label: "Inventory" },
  { id: "visibility", label: "Visibility" }
];

export function parseAdminUnitSection(raw: string | string[] | undefined): AdminUnitSection {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "inventory") {
    return "checkin";
  }
  if (v === "listing" || v === "visibility" || v === "checkin") {
    return v;
  }
  return "overview";
}

export function AdminUnitSectionNav({ unitId, section }: { unitId: string; section: AdminUnitSection }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4" aria-label="Unit sections">
      {SECTIONS.map((s) => (
        <Link
          key={s.id}
          href={
            s.id === "overview"
              ? `/admin/units/${unitId}`
              : s.id === "checkin"
                ? `/admin/units/${unitId}?section=inventory`
                : `/admin/units/${unitId}?section=${s.id}`
          }
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            section === s.id
              ? "bg-foreground text-background"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
