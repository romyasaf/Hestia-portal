"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  isStaffPortalPermission,
  STAFF_PORTAL_PERMISSIONS,
  STAFF_PORTAL_PERMISSION_LABELS,
  type StaffPortalPermission
} from "@/lib/rbac/staff-permissions";
import { createStaffUser, updateStaffUser } from "@/server/actions/admin-staff";
import { Button } from "@/components/ui/button";

type Props = {
  userId?: string;
  initial?: { email: string; fullName: string; phone: string; isActive: boolean };
  /** `null` = no DB rows yet (legacy full access); pre-check all in UI until first save. */
  initialPermissionCodes?: string[] | null;
};

function initialChecked(
  userId: string | undefined,
  initialPermissionCodes: string[] | null | undefined
): Set<StaffPortalPermission> {
  if (!userId) {
    return new Set(STAFF_PORTAL_PERMISSIONS);
  }
  if (initialPermissionCodes === null || initialPermissionCodes === undefined) {
    return new Set(STAFF_PORTAL_PERMISSIONS);
  }
  const next = new Set<StaffPortalPermission>();
  for (const c of initialPermissionCodes) {
    if (isStaffPortalPermission(c)) {
      next.add(c);
    }
  }
  return next;
}

export function AdminStaffForm({ userId, initial, initialPermissionCodes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [checked, setChecked] = useState(() => initialChecked(userId, initialPermissionCodes));

  const permissionList = useMemo(
    () => STAFF_PORTAL_PERMISSIONS.map((code) => ({ code, label: STAFF_PORTAL_PERMISSION_LABELS[code] })),
    []
  );

  const toggle = (code: StaffPortalPermission) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(code)) {
        n.delete(code);
      } else {
        n.add(code);
      }
      return n;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const permissions = Array.from(checked);
      if (userId) {
        const res = await updateStaffUser({
          userId,
          email,
          fullName,
          phone,
          isActive,
          permissions
        });
        if (!res.ok) {
          setMessage(
            res.error === "email_in_use"
              ? "Email already in use."
              : res.error === "permissions_required"
                ? "Select at least one portal permission."
                : "Could not update staff member."
          );
          return;
        }
      } else {
        if (password.length < 8) {
          setMessage("Password must be at least 8 characters.");
          return;
        }
        const res = await createStaffUser({ email, password, fullName, phone, permissions });
        if (!res.ok) {
          setMessage(
            res.error === "email_in_use"
              ? "Email already in use."
              : res.error === "no_staff_role"
                ? "Staff role missing in database."
                : res.error === "permissions_required"
                  ? "Select at least one portal permission."
                  : "Could not create staff member."
          );
          return;
        }
      }
      router.push("/admin/staff");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Full name</label>
        <input
          required
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Phone</label>
        <input
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {!userId ? (
        <div>
          <label className="text-sm font-medium">Initial password</label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (login allowed)
        </label>
      )}
      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium">Portal permissions</legend>
        <p className="text-xs text-muted-foreground">
          Controls which staff areas and maintenance actions apply after sign-in. Admins are not limited by this
          list.
        </p>
        {userId && (initialPermissionCodes === null || initialPermissionCodes === undefined) ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            This account has no saved permission rows yet (full access). Saving will store the selection below
            explicitly.
          </p>
        ) : null}
        <ul className="space-y-2">
          {permissionList.map(({ code, label }) => (
            <li key={code}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked.has(code)}
                  onChange={() => toggle(code)}
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-1 font-mono text-xs text-muted-foreground">{code}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {userId ? "Save staff member" : "Create staff member"}
      </Button>
    </form>
  );
}
