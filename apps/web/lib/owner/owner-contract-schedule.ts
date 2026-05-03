/**
 * Each entry is the UTC midnight of the 1st of a calendar month in the inclusive [startDate, endDate] range.
 * Used to generate monthly owner-contract expense rows.
 */
export function listUtcMonthStartsInclusive(startDate: Date, endDate: Date): Date[] {
  const out: Date[] = [];
  let y = startDate.getUTCFullYear();
  let m = startDate.getUTCMonth();
  const endY = endDate.getUTCFullYear();
  const endM = endDate.getUTCMonth();
  for (;;) {
    if (y > endY || (y === endY && m > endM)) {
      break;
    }
    out.push(new Date(Date.UTC(y, m, 1)));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}
