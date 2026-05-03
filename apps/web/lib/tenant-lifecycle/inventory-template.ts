export type CheckinInventoryTemplateLine = {
  id: string;
  /** Display name for the checklist item (legacy JSON may use `name`). */
  label: string;
  /** Suggested / expected condition wording for the tenant at check-in. */
  defaultCondition?: string;
  /** Optional staff or unit setup notes — shown during check-in only, not on listings. */
  notes?: string;
};

export type OnboardingInventoryLine = CheckinInventoryTemplateLine & {
  ack: "confirmed" | "issue" | null;
  issueSummary?: string;
  /** Optional tenant notes for this line (check-in only). */
  tenantNotes?: string;
};

export const DEFAULT_CHECKIN_FALLBACK_LINES: CheckinInventoryTemplateLine[] = [
  { id: "tpl-wall", label: "General walls & paint", defaultCondition: "Document baseline" },
  { id: "tpl-floor", label: "Flooring", defaultCondition: "Document baseline" },
  { id: "tpl-win", label: "Windows & balcony doors", defaultCondition: "Document baseline" },
  { id: "tpl-kit", label: "Kitchen cabinets & counters", defaultCondition: "Document baseline" },
  { id: "tpl-bath", label: "Bathroom fixtures", defaultCondition: "Document baseline" },
  { id: "tpl-pwr", label: "Lighting & power outlets", defaultCondition: "Document baseline" },
  { id: "tpl-ac", label: "AC / ventilation grilles", defaultCondition: "Document baseline" },
  { id: "tpl-keys", label: "Keys, remotes, access cards", defaultCondition: "Received as listed" }
];

export function normalizeTemplateFromJson(raw: unknown): CheckinInventoryTemplateLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: CheckinInventoryTemplateLine[] = [];
  raw.forEach((item, idx) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : `tpl-unit-${idx}`;
      const nameRaw = typeof o.name === "string" ? o.name : typeof o.label === "string" ? o.label : "";
      const label = nameRaw.trim();
      if (!label) {
        return;
      }
      const defaultCondition =
        typeof o.defaultCondition === "string" ? o.defaultCondition.trim() : undefined;
      const notes = typeof o.notes === "string" ? o.notes.trim() : undefined;
      out.push({
        id,
        label,
        defaultCondition: defaultCondition || undefined,
        notes: notes || undefined
      });
    }
  });
  return out;
}

export function templateLinesToOnboardingLines(lines: CheckinInventoryTemplateLine[]): OnboardingInventoryLine[] {
  return lines.map((l) => ({
    ...l,
    ack: null,
    issueSummary: "",
    tenantNotes: ""
  }));
}

/** @deprecated Use `buildOnboardingInventorySeedForUnit` from server queries after loading master + unit merge. */
export function seedOnboardingInventoryLines(unitTemplate: unknown): OnboardingInventoryLine[] {
  const fromUnit = normalizeTemplateFromJson(unitTemplate);
  const base = fromUnit.length > 0 ? fromUnit : DEFAULT_CHECKIN_FALLBACK_LINES;
  return templateLinesToOnboardingLines(base);
}

export function parseOnboardingInventory(raw: unknown): OnboardingInventoryLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, idx) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const ackRaw = o.ack;
    const ack = ackRaw === "confirmed" || ackRaw === "issue" ? ackRaw : null;
    const nameRaw = typeof o.name === "string" ? o.name : typeof o.label === "string" ? o.label : "";
    return {
      id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `inv-${idx}`,
      label: nameRaw.trim(),
      defaultCondition: typeof o.defaultCondition === "string" ? o.defaultCondition : undefined,
      notes: typeof o.notes === "string" ? o.notes : undefined,
      ack,
      issueSummary: typeof o.issueSummary === "string" ? o.issueSummary : "",
      tenantNotes: typeof o.tenantNotes === "string" ? o.tenantNotes : ""
    };
  });
}
