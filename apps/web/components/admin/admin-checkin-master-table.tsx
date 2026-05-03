"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createCheckinInventoryMasterItem,
  deleteCheckinInventoryMasterItem,
  updateCheckinInventoryMasterItem
} from "@/server/actions/admin-checkin-master";
import { Button } from "@/components/ui/button";

export type MasterRow = {
  id: string;
  sortOrder: number;
  itemName: string;
  conditionHint: string | null;
  notes: string | null;
};

type Props = {
  initial: MasterRow[];
};

export function AdminCheckinMasterTable({ initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MasterRow[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCond, setNewCond] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const serializedInitial = JSON.stringify(initial);
  useEffect(() => {
    setRows(JSON.parse(serializedInitial) as MasterRow[]);
  }, [serializedInitial]);

  const refresh = () => {
    router.refresh();
  };

  const updateRowById = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      return;
    }
    setMsg(null);
    setPendingId(row.id);
    const res = await updateCheckinInventoryMasterItem({
      id: row.id,
      itemName: row.itemName,
      conditionHint: row.conditionHint ?? "",
      notes: row.notes ?? "",
      sortOrder: row.sortOrder
    });
    setPendingId(null);
    if (!res.ok) {
      setMsgTone("err");
      setMsg(res.error === "missing_fields" ? "Item name is required." : "Update failed.");
      return;
    }
    setMsgTone("ok");
    setMsg("Updated.");
    refresh();
  };

  const removeRow = async (id: string) => {
    setMsg(null);
    setMsgTone("ok");
    setPendingId(id);
    const res = await deleteCheckinInventoryMasterItem({ id });
    setPendingId(null);
    if (!res.ok) {
      setMsgTone("err");
      setMsg(
        res.error === "cannot_delete_last"
          ? "Keep at least one master row."
          : res.error === "delete_failed"
            ? "Could not delete."
            : "Delete failed."
      );
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setMsgTone("ok");
    setMsg("Deleted.");
    refresh();
  };

  const addRow = async () => {
    setMsg(null);
    setPendingId("new");
    const res = await createCheckinInventoryMasterItem({
      itemName: newName,
      conditionHint: newCond,
      notes: newNotes
    });
    setPendingId(null);
    if (!res.ok) {
      setMsgTone("err");
      setMsg(res.error === "missing_name" ? "Enter an item name." : "Could not add.");
      return;
    }
    setNewName("");
    setNewCond("");
    setNewNotes("");
    setMsgTone("ok");
    setMsg("Added.");
    refresh();
  };

  return (
    <div className="space-y-6">
      {msg ? (
        <p
          className={
            msgTone === "ok"
              ? "text-sm text-emerald-700 dark:text-emerald-400"
              : "text-sm text-destructive"
          }
        >
          {msg}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Sort</th>
              <th className="px-3 py-2 font-medium">Item name</th>
              <th className="px-3 py-2 font-medium">Condition hint</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MasterEditorRow
                key={row.id}
                row={row}
                onChange={(next) => setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)))}
                onSave={() => void updateRowById(row.id)}
                onDelete={() => void removeRow(row.id)}
                disabled={pendingId === row.id}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Add master line</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Item name</label>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={pendingId === "new"}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Condition hint</label>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={newCond}
              onChange={(e) => setNewCond(e.target.value)}
              disabled={pendingId === "new"}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              disabled={pendingId === "new"}
            />
          </div>
        </div>
        <Button type="button" className="mt-3" onClick={addRow} disabled={pendingId === "new"}>
          {pendingId === "new" ? "Adding…" : "Add to master"}
        </Button>
      </div>
    </div>
  );
}

function MasterEditorRow({
  row,
  onChange,
  onSave,
  onDelete,
  disabled
}: {
  row: MasterRow;
  onChange: (r: MasterRow) => void;
  onSave: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-3 py-2 align-top">
        <input
          type="number"
          min={0}
          className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
          value={row.sortOrder}
          onChange={(e) => onChange({ ...row, sortOrder: Number.parseInt(e.target.value, 10) || 0 })}
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <input
          className="h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
          value={row.itemName}
          onChange={(e) => onChange({ ...row, itemName: e.target.value })}
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <input
          className="h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
          value={row.conditionHint ?? ""}
          onChange={(e) => onChange({ ...row, conditionHint: e.target.value || null })}
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <input
          className="h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
          value={row.notes ?? ""}
          onChange={(e) => onChange({ ...row, notes: e.target.value || null })}
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onSave} disabled={disabled}>
            Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={disabled}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
