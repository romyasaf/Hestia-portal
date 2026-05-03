"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveUnit, deletePropertyWithSafety, deleteUnitWithSafety } from "@/server/actions/admin-entities";
import { Button } from "@/components/ui/button";

export function PortfolioUnitLifecycleButtons({
  unitId,
  unitLabel,
  canHardDelete
}: {
  unitId: string;
  unitLabel: string;
  canHardDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onArchive = () => {
    setMsg(null);
    if (!window.confirm(`Archive ${unitLabel}? It will be hidden from active inventory (no calendar-active lease).`)) {
      return;
    }
    start(async () => {
      const res = await archiveUnit({ unitId });
      if (!res.ok) {
        setMsg(
          res.error === "unit_has_active_lease"
            ? "End or move the active lease before archiving."
            : "Could not archive this unit."
        );
        return;
      }
      router.refresh();
    });
  };

  const onDelete = () => {
    setMsg(null);
    if (
      !window.confirm(
        `Permanently delete ${unitLabel}? This cannot be undone. Only use when the unit has no leases, tickets, expenses, or owner contracts.`
      )
    ) {
      return;
    }
    start(async () => {
      const res = await deleteUnitWithSafety({ unitId });
      if (!res.ok) {
        setMsg(
          res.error === "unit_has_history_use_archive"
            ? "This unit has linked history — use Archive instead of delete."
            : "Could not delete this unit."
        );
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      {msg ? <p className="max-w-[14rem] text-right text-xs text-destructive">{msg}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {canHardDelete ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onDelete}>
            Delete unit
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onArchive}>
            Archive unit
          </Button>
        )}
      </div>
    </div>
  );
}

export function PortfolioBuildingLifecycleButton({
  propertyId,
  propertyLabel,
  canHardDelete
}: {
  propertyId: string;
  propertyLabel: string;
  canHardDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!canHardDelete) {
    return (
      <p className="max-w-[10rem] text-right text-xs text-muted-foreground">
        Linked data present — remove contracts, tickets, expenses, and lease history before delete.
      </p>
    );
  }

  const onDelete = () => {
    setMsg(null);
    if (
      !window.confirm(
        `Permanently delete ${propertyLabel} and all units inside it? Only available when nothing is linked.`
      )
    ) {
      return;
    }
    start(async () => {
      const res = await deletePropertyWithSafety({ propertyId });
      if (!res.ok) {
        setMsg(
          res.error === "property_has_history"
            ? "Building still has linked records."
            : "Could not delete this building."
        );
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {msg ? <p className="max-w-[12rem] text-right text-xs text-destructive">{msg}</p> : null}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onDelete}>
        Delete building
      </Button>
    </div>
  );
}
