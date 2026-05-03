import Link from "next/link";
import { AdminCheckinMasterTable } from "@/components/admin/admin-checkin-master-table";
import { listCheckinInventoryMasterItems } from "@/server/queries/checkin-inventory-master";

export default async function AdminCheckinInventoryMasterPage() {
  const items = await listCheckinInventoryMasterItems();
  const initial = items.map((r) => ({
    id: r.id,
    sortOrder: r.sortOrder,
    itemName: r.itemName,
    conditionHint: r.conditionHint,
    notes: r.notes
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/dashboard" className="text-primary hover:underline">
          ← Admin
        </Link>
      </p>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in inventory (master)</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Default move-in checklist lines for every unit. Per-unit extras are configured on each unit under{" "}
          <strong>Check-in</strong>. This data is only used during tenant check-in — it is never shown on public
          listings.
        </p>
      </header>
      <AdminCheckinMasterTable initial={initial} />
    </div>
  );
}
