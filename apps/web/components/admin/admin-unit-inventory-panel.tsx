"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import {
  copyMasterInventoryToUnit,
  createUnitInventoryItem,
  deleteUnitInventoryItem
} from "@/server/actions/unit-inventory";
import { UNIT_INVENTORY_CATEGORIES } from "@/lib/inventory/categories";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  itemName: string;
  category: string;
  quantity: { toString(): string };
  conditionLabel: string;
  notes: string | null;
  photoUrl: string | null;
};

export function AdminUnitInventoryPanel({ unitId, items }: { unitId: string; items: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [quantity, setQuantity] = useState("1");
  const [conditionLabel, setConditionLabel] = useState("good");
  const [notes, setNotes] = useState("");

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await createUnitInventoryItem({
        unitId,
        itemName,
        category,
        quantity,
        conditionLabel,
        notes
      });
      if (!res.ok) {
        setMsg("Could not add item.");
        return;
      }
      setItemName("");
      setNotes("");
      router.refresh();
    });
  };

  const onCopyMaster = () => {
    setMsg(null);
    start(async () => {
      const res = await copyMasterInventoryToUnit({ unitId });
      if (!res.ok) {
        setMsg(res.error === "no_master_items" ? "No master template rows defined yet." : "Copy failed.");
        return;
      }
      router.refresh();
    });
  };

  const onDelete = (itemId: string) => {
    if (!window.confirm("Remove this inventory line?")) return;
    setMsg(null);
    start(async () => {
      const res = await deleteUnitInventoryItem({ itemId });
      if (!res.ok) {
        setMsg("Could not delete.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Unit inventory (check-in)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational inventory only — never shown on public listings. Use{" "}
          <span className="font-medium text-foreground">Copy from master</span> to seed from the global checklist.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onCopyMaster}>
          Copy from master template
        </Button>
      </div>

      <form onSubmit={onCreate} className="grid gap-3 rounded-lg border border-border/80 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Item name</label>
          <input
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {UNIT_INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Quantity</label>
          <input
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Condition</label>
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={conditionLabel}
            onChange={(e) => setConditionLabel(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            Add item
          </Button>
        </div>
      </form>

      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No structured inventory lines yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{r.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {r.category.replace(/_/g, " ")} · qty {r.quantity.toString()} · {r.conditionLabel}
                </p>
                {r.notes?.trim() ? <p className="mt-1 text-muted-foreground">{r.notes}</p> : null}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(r.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
