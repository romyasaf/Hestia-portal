/** Split a monetary total (major units, e.g. QAR) across N parts with no systematic bias; sums exactly. */
export function splitMoneyEqualParts(total: number, partCount: number): number[] {
  if (partCount <= 0 || !Number.isFinite(total)) {
    return [];
  }
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / partCount);
  const out = Array.from({ length: partCount }, () => each);
  let remainder = cents - each * partCount;
  for (let i = 0; i < remainder; i += 1) {
    out[i] += 1;
  }
  return out.map((c) => c / 100);
}
