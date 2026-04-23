export type CheckinInventoryTemplateLine = {
  id: string;
  label: string;
  defaultCondition?: string;
};

export type OnboardingInventoryLine = CheckinInventoryTemplateLine & {
  ack: "confirmed" | "issue" | null;
  issueSummary?: string;
};

const FALLBACK_LINES: CheckinInventoryTemplateLine[] = [
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
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (!label) {
        return;
      }
      const defaultCondition =
        typeof o.defaultCondition === "string" ? o.defaultCondition.trim() : undefined;
      out.push({ id, label, defaultCondition });
    }
  });
  return out;
}

export function seedOnboardingInventoryLines(
  unitTemplate: unknown
): OnboardingInventoryLine[] {
  const fromUnit = normalizeTemplateFromJson(unitTemplate);
  const base = fromUnit.length > 0 ? fromUnit : FALLBACK_LINES;
  return base.map((l) => ({
    ...l,
    ack: null,
    issueSummary: ""
  }));
}

export function parseOnboardingInventory(raw: unknown): OnboardingInventoryLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, idx) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const ackRaw = o.ack;
    const ack = ackRaw === "confirmed" || ackRaw === "issue" ? ackRaw : null;
    return {
      id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `inv-${idx}`,
      label: typeof o.label === "string" ? o.label : "",
      defaultCondition: typeof o.defaultCondition === "string" ? o.defaultCondition : undefined,
      ack,
      issueSummary: typeof o.issueSummary === "string" ? o.issueSummary : ""
    };
  });
}
