const DAY_MS = 86400000;

/** UTC midnight for “today” comparisons. */
export function utcTodayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type ActionPriorityBand = "urgent" | "today" | "upcoming" | "none";

/**
 * Bands for a scheduled timestamp:
 * - `urgent`: in the past (missed / overdue)
 * - `today`: same UTC calendar day as now
 * - `upcoming`: within the next 7 UTC days after today
 */
export function priorityBandForAppointment(at: Date | null | undefined): ActionPriorityBand {
  if (!at || Number.isNaN(at.getTime())) {
    return "none";
  }
  const t = at.getTime();
  const dayStart = utcTodayStart().getTime();
  const dayEnd = dayStart + DAY_MS;
  if (t < dayStart) {
    return "urgent";
  }
  if (t < dayEnd) {
    return "today";
  }
  if (t < dayEnd + 7 * DAY_MS) {
    return "upcoming";
  }
  return "none";
}

export function mergePriorityBands(
  appointmentBand: ActionPriorityBand,
  explicitUrgent: boolean
): ActionPriorityBand {
  if (explicitUrgent || appointmentBand === "urgent") {
    return "urgent";
  }
  if (appointmentBand === "today") {
    return "today";
  }
  if (appointmentBand === "upcoming") {
    return "upcoming";
  }
  return "none";
}
