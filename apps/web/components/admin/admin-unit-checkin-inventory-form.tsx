"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type { CheckinInventoryTemplateLine } from "@/lib/tenant-lifecycle/inventory-template";
import { updateUnitCheckinInventoryTemplate } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

function newLine(): CheckinInventoryTemplateLine {
  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: "",
    defaultCondition: "",
    notes: ""
  };
}

type Props = {
  unitId: string;
  initialLines: CheckinInventoryTemplateLine[];
};

export function AdminUnitCheckinInventoryForm({ unitId, initialLines }: Props) {
  const router = useRouter();
  const [lines, setLines] = useState<CheckinInventoryTemplateLine[]>(
    initialLines.length > 0 ? initialLines : [newLine()]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialKey = JSON.stringify(initialLines);
  useEffect(() => {
    const parsed = JSON.parse(initialKey) as CheckinInventoryTemplateLine[];
    setLines(parsed.length > 0 ? parsed : [newLine()]);
  }, [initialKey]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setMessage(null);
    setIsSubmitting(true);
    try {
      const payload = lines
        .map((l) => ({
          id: l.id,
          label: l.label.trim(),
          defaultCondition: l.defaultCondition?.trim() || undefined,
          notes: l.notes?.trim() || undefined
        }))
        .filter((l) => l.label.length > 0);

      const res = await updateUnitCheckinInventoryTemplate({ unitId, lines: payload });
      if (!res.ok) {
        setMessage(res.error === "invalid_unit" ? "Unit not found." : "Could not save.");
        setIsSubmitting(false);
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } catch {
      setMessage("Save failed.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Unit check-in inventory</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          These rows are <strong>added after</strong> the{" "}
          <Link href="/admin/check-in-inventory" className="font-medium text-primary hover:underline">
            company-wide master checklist
          </Link>{" "}
          when a tenant starts move-in. They are only used during check-in — they never appear on public listings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <ul className="space-y-4">
          {lines.map((line, index) => (
            <li key={line.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Extra line {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                  disabled={isSubmitting}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Item name</label>
                  <input
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={line.label}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, label: e.target.value } : l)))
                    }
                    placeholder="e.g. Smart thermostat"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Condition (hint)</label>
                  <input
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={line.defaultCondition ?? ""}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) => (l.id === line.id ? { ...l, defaultCondition: e.target.value } : l))
                      )
                    }
                    placeholder="Expected state"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <input
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={line.notes ?? ""}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, notes: e.target.value } : l)))
                    }
                    placeholder="Internal context for staff / tenant"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          onClick={() => setLines((prev) => [...prev, newLine()])}
          disabled={isSubmitting}
        >
          Add line
        </Button>

        {message ? (
          <p
            className={
              message === "Saved." ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"
            }
          >
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save check-in extras"}
        </Button>
      </form>
    </div>
  );
}
