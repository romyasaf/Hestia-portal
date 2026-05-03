"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { deleteOwnerUser, updateOwnerUser } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  initial: {
    email: string;
    fullName: string;
    phone: string;
    isActive: boolean;
  };
};

export function AdminOwnerEditForm({ userId, initial }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email);
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await updateOwnerUser({
        userId,
        email,
        fullName,
        phone,
        isActive,
        newPassword: newPassword.trim() || undefined
      });
      if (!res.ok) {
        setMessage(
          res.error === "email_in_use"
            ? "That email is already used by another account."
            : res.error === "weak_password"
              ? "New password must be at least 8 characters."
              : res.error === "not_owner"
                ? "This user does not have the owner role."
                : res.error === "missing_fields"
                  ? "Email and full name are required."
                  : "Could not save."
        );
        return;
      }
      setMessage("Saved.");
      setNewPassword("");
      router.refresh();
    } catch {
      setMessage("Save failed.");
    }
    setIsSubmitting(false);
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        "Remove this owner from the portal? Building and unit assignments for this owner will be cleared. If the account has no other roles and no other database links, the user record will be deleted; otherwise the account stays without the owner role."
      )
    ) {
      return;
    }
    if (isDeleting) return;
    setMessage(null);
    setIsDeleting(true);
    try {
      const res = await deleteOwnerUser({ userId });
      if (!res.ok) {
        setMessage(
          res.error === "cannot_delete_self"
            ? "You cannot remove your own account this way."
            : res.error === "not_owner"
              ? "Not an owner account."
              : res.error === "delete_blocked_refs"
                ? "Could not complete removal: the database still references this account (e.g. as tenant on a lease, tickets, or invoices). Nothing was changed. Resolve those links first, or remove only the owner role manually after clearing assignments."
                : "Delete failed."
        );
        setIsDeleting(false);
        return;
      }
      router.push("/admin/owners");
      router.refresh();
    } catch {
      setMessage("Delete failed.");
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Profile</h2>
        <div>
          <label className="text-sm font-medium" htmlFor="owner-email">
            Email
          </label>
          <input
            id="owner-email"
            type="email"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="owner-name">
            Full name
          </label>
          <input
            id="owner-name"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="owner-phone">
            Phone
          </label>
          <input
            id="owner-phone"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="owner-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="owner-active" className="text-sm font-medium">
            Account active (can sign in)
          </label>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="owner-pw">
            New password (optional)
          </label>
          <input
            id="owner-pw"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            disabled={isSubmitting}
          />
        </div>
        {message ? (
          <p
            className={
              message === "Saved." ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"
            }
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" asChild disabled={isSubmitting}>
            <Link href="/admin/owners">Cancel</Link>
          </Button>
        </div>
      </form>

      <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Remove owner</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Clears this person as building or direct unit owner, removes the <strong className="text-foreground">owner</strong>{" "}
          role, then deletes the user row only if they have no other roles and nothing else references the account.
        </p>
        <Button type="button" variant="destructive" className="mt-4" disabled={isDeleting} onClick={() => void onDelete()}>
          {isDeleting ? "Removing…" : "Remove owner / delete account"}
        </Button>
      </div>
    </div>
  );
}
