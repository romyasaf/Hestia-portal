/** Pure formatting — safe for client and server (no DB). */
export function formatFinanceMoney(n: number): string {
  if (!Number.isFinite(n)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "QAR", maximumFractionDigits: 0 }).format(n);
}
