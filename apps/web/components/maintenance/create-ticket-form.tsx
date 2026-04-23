"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createMaintenanceTicket } from "@/server/actions/maintenance";
import { Button } from "@/components/ui/button";

const priorities = ["low", "medium", "high", "urgent"] as const;

export function CreateMaintenanceTicketForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<string>("medium");
  const [description, setDescription] = useState("");
  const [permissionToEnter, setPermissionToEnter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createMaintenanceTicket({
        title,
        category,
        priority,
        description: description || undefined,
        permissionToEnter
      });
      if (!res.ok) {
        if (res.error === "no_active_lease") {
          setMessage("You need an active lease before opening a ticket.");
        } else if (res.error === "missing_fields") {
          setMessage("Title and category are required.");
        } else {
          setMessage("Could not create ticket. Try again.");
        }
        return;
      }
      setTitle("");
      setDescription("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">New maintenance ticket</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="mt-title">
            Title
          </label>
          <input
            id="mt-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="mt-cat">
            Category
          </label>
          <input
            id="mt-cat"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="mt-pri">
            Priority
          </label>
          <select
            id="mt-pri"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={permissionToEnter}
              onChange={(e) => setPermissionToEnter(e.target.checked)}
            />
            Permission to enter if I&apos;m not home
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="mt-desc">
            Description
          </label>
          <textarea
            id="mt-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit ticket"}
      </Button>
    </form>
  );
}
