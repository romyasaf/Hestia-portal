import {
  DEFAULT_CHECKIN_FALLBACK_LINES,
  normalizeTemplateFromJson,
  type CheckinInventoryTemplateLine,
  templateLinesToOnboardingLines,
  type OnboardingInventoryLine
} from "@/lib/tenant-lifecycle/inventory-template";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Merges global master rows with unit-specific JSON lines (additions/overrides).
 * Used only for tenant check-in onboarding — never for public listings.
 */
export async function loadMergedCheckinTemplateForUnit(
  unitTemplateJson: unknown
): Promise<CheckinInventoryTemplateLine[]> {
  let master: { id: string; itemName: string; conditionHint: string | null; notes: string | null }[] = [];
  try {
    master = await prisma.checkinInventoryMasterItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2021") {
      throw e;
    }
  }
  const fromMaster: CheckinInventoryTemplateLine[] = master.map((m) => ({
    id: `master-${m.id}`,
    label: m.itemName.trim(),
    defaultCondition: m.conditionHint?.trim() || undefined,
    notes: m.notes?.trim() || undefined
  }));

  const fromUnit = normalizeTemplateFromJson(unitTemplateJson).map((l, idx) => ({
    ...l,
    id: l.id.startsWith("master-") ? `unit-${idx}-${l.id.replace(/^master-/, "")}` : l.id
  }));

  const merged = [...fromMaster, ...fromUnit];
  if (merged.length > 0) {
    return merged;
  }
  return [...DEFAULT_CHECKIN_FALLBACK_LINES];
}

export async function buildOnboardingInventorySeedForUnit(
  unitTemplateJson: unknown
): Promise<OnboardingInventoryLine[]> {
  const merged = await loadMergedCheckinTemplateForUnit(unitTemplateJson);
  return templateLinesToOnboardingLines(merged);
}
