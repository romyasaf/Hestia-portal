"use server";

import { revalidatePath } from "next/cache";
import {
  parseOnboardingInventory,
  seedOnboardingInventoryLines,
  type OnboardingInventoryLine
} from "@/lib/tenant-lifecycle/inventory-template";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/server/audit/log";
import { guardActionRoles } from "@/server/auth/action-guard";
import { getActiveLeaseForTenant } from "@/server/queries/leases";
import { getOpenCheckInForLease } from "@/server/queries/checkin";
import { Prisma } from "@prisma/client";

export type TenantOnboardingResult = { ok: true } | { ok: false; error: string };

/** Calendar-active lease row for a tenant still in onboarding (onboarding not completed). */
async function onboardingLeaseRow(userId: string) {
  const cal = await getActiveLeaseForTenant(userId);
  if (!cal) {
    return null;
  }
  if (cal.onboardingCompletedAt) {
    return null;
  }
  return prisma.lease.findUnique({
    where: { id: cal.leaseId, tenantUserId: userId },
    select: {
      id: true,
      tenantUserId: true,
      unit: { select: { checkinInventoryTemplate: true } }
    }
  });
}

export async function ensureOnboardingCheckinInventory(): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const full = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: { onboardingCheckinInventory: true, unit: { select: { checkinInventoryTemplate: true } } }
  });
  if (!full) {
    return { ok: false, error: "not_found" };
  }
  const cur = parseOnboardingInventory(full.onboardingCheckinInventory);
  if (cur.length > 0) {
    return { ok: true };
  }
  const seeded = seedOnboardingInventoryLines(full.unit.checkinInventoryTemplate);
  await prisma.lease.update({
    where: { id: lease.id },
    data: { onboardingCheckinInventory: seeded as unknown as Prisma.InputJsonValue }
  });
  revalidatePath("/tenant/onboarding/check-in");
  return { ok: true };
}

export async function signTenantLeaseContract(input: { signerName: string }): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const name = input.signerName?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "missing_signer" };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const row = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: { contractSignedAt: true }
  });
  if (row?.contractSignedAt) {
    return { ok: false, error: "already_signed" };
  }
  await prisma.lease.update({
    where: { id: lease.id },
    data: {
      contractSignedAt: new Date(),
      contractSignerName: name
    }
  });
  auditLog({
    type: "workflow",
    action: "tenant_lease_contract_signed",
    actorUserId: guard.userId,
    recordType: "lease",
    recordId: lease.id,
    meta: { signerName: name }
  });
  revalidatePath("/tenant/onboarding");
  revalidatePath("/tenant/onboarding/contract");
  revalidatePath("/tenant/dashboard");
  return { ok: true };
}

export async function tenantBookChequeAppointment(input: {
  appointmentAt: string;
  notes?: string;
}): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const full = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: { contractSignedAt: true, chequeDeliveryState: true }
  });
  if (!full?.contractSignedAt) {
    return { ok: false, error: "contract_required" };
  }
  if (full.chequeDeliveryState === "approved" || full.chequeDeliveryState === "marked_delivered") {
    return { ok: false, error: "invalid_state" };
  }
  const at = new Date(input.appointmentAt.trim());
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "invalid_date" };
  }
  await prisma.lease.update({
    where: { id: lease.id },
    data: {
      chequeDeliveryState: "appointment_booked",
      chequeAppointmentAt: at,
      chequeAppointmentNotes: input.notes?.trim() || null
    }
  });
  revalidatePath("/tenant/onboarding/cheques");
  return { ok: true };
}

export async function tenantMarkChequesDelivered(): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const full = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: { contractSignedAt: true, chequeDeliveryState: true }
  });
  if (!full?.contractSignedAt) {
    return { ok: false, error: "contract_required" };
  }
  if (full.chequeDeliveryState === "approved") {
    return { ok: false, error: "invalid_state" };
  }
  await prisma.lease.update({
    where: { id: lease.id },
    data: {
      chequeDeliveryState: "marked_delivered",
      chequeMarkedDeliveredAt: new Date()
    }
  });
  revalidatePath("/tenant/onboarding/cheques");
  return { ok: true };
}

export async function saveOnboardingInventoryDraft(lines: OnboardingInventoryLine[]): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const full = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: { contractSignedAt: true, chequeDeliveryState: true }
  });
  if (!full?.contractSignedAt || full.chequeDeliveryState !== "approved") {
    return { ok: false, error: "prerequisites" };
  }
  const open = await getOpenCheckInForLease(lease.id);
  if (open) {
    return { ok: false, error: "checkin_in_progress" };
  }
  await prisma.lease.update({
    where: { id: lease.id },
    data: { onboardingCheckinInventory: lines as unknown as Prisma.InputJsonValue }
  });
  revalidatePath("/tenant/onboarding/check-in");
  return { ok: true };
}

export async function completeOnboardingCheckIn(input: {
  tenantNotes?: string;
}): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const lease = await onboardingLeaseRow(guard.userId);
  if (!lease || lease.tenantUserId !== guard.userId) {
    return { ok: false, error: "no_onboarding_lease" };
  }
  const full = await prisma.lease.findUnique({
    where: { id: lease.id },
    select: {
      contractSignedAt: true,
      chequeDeliveryState: true,
      onboardingCheckinInventory: true
    }
  });
  if (!full?.contractSignedAt || full.chequeDeliveryState !== "approved") {
    return { ok: false, error: "prerequisites" };
  }
  const open = await getOpenCheckInForLease(lease.id);
  if (open) {
    return { ok: false, error: "checkin_in_progress" };
  }
  const lines = parseOnboardingInventory(full.onboardingCheckinInventory);
  if (lines.length === 0) {
    return { ok: false, error: "empty_inventory" };
  }
  for (const line of lines) {
    if (line.ack !== "confirmed" && line.ack !== "issue") {
      return { ok: false, error: "incomplete_inventory" };
    }
    if (line.ack === "issue" && !(line.issueSummary?.trim())) {
      return { ok: false, error: "issue_needs_summary" };
    }
  }

  const issues = lines
    .filter((l) => l.ack === "issue")
    .map((l) => ({
      summary: `${l.label}: reported at check-in`,
      details: l.issueSummary?.trim() ?? null,
      severity: "medium" as const,
      areaLabel: l.label
    }));

  await prisma.$transaction(async (tx) => {
    const checkIn = await tx.leaseCheckIn.create({
      data: {
        leaseId: lease.id,
        tenantUserId: guard.userId,
        status: "submitted",
        tenantNotes: input.tenantNotes?.trim() || null
      }
    });
    if (issues.length > 0) {
      await tx.leaseCheckInIssue.createMany({
        data: issues.map((i) => ({
          checkInId: checkIn.id,
          summary: i.summary,
          details: i.details,
          severity: i.severity,
          areaLabel: i.areaLabel
        }))
      });
    }
    await tx.lease.update({
      where: { id: lease.id },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingCheckinInventory: [] as unknown as Prisma.InputJsonValue
      }
    });
  });

  auditLog({
    type: "workflow",
    action: "tenant_onboarding_completed",
    actorUserId: guard.userId,
    recordType: "lease",
    recordId: lease.id,
    meta: {}
  });

  revalidatePath("/tenant");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/onboarding");
  revalidatePath("/tenant/checkin");
  return { ok: true };
}

export async function submitTenantLeaseInquiryFromPortal(input: {
  message: string;
}): Promise<TenantOnboardingResult> {
  const guard = await guardActionRoles(["tenant"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const msg = input.message?.trim();
  if (!msg || msg.length < 8) {
    return { ok: false, error: "missing_message" };
  }
  const user = await prisma.user.findUnique({
    where: { id: guard.userId },
    select: { fullName: true, email: true, phone: true }
  });
  if (!user) {
    return { ok: false, error: "not_found" };
  }
  await prisma.leadInquiry.create({
    data: {
      inquiryType: "tenant",
      status: "new",
      fullName: user.fullName,
      phone: user.phone?.trim() || "—",
      email: user.email,
      message: msg,
      context: { source: "tenant_portal_lease_inquiry", userId: guard.userId } as Prisma.InputJsonValue
    }
  });
  revalidatePath("/tenant/account");
  return { ok: true };
}
