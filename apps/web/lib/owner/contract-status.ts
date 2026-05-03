export type ContractLifecycleStatus = "upcoming" | "active" | "expired";

/** Compare calendar dates in UTC (owner contract dates are @db.Date). */
export function computeContractLifecycleStatus(start: Date, end: Date, ref: Date = new Date()): ContractLifecycleStatus {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const d = ref.getUTCDate();
  const today = new Date(Date.UTC(y, m, d));
  const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  if (e < today) {
    return "expired";
  }
  if (s > today) {
    return "upcoming";
  }
  return "active";
}
