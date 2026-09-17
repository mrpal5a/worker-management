/**
 * All dates in this app are calendar dates with no time component.
 *
 * Postgres DATE columns come back through Prisma as JS Date objects set to
 * UTC midnight. Using local-time getters such as getDate() on those returns
 * the PREVIOUS day for anyone west of UTC, which would silently misfile
 * attendance. Every date operation must go through these helpers, which use
 * UTC getters exclusively.
 */

/** Format a UTC-midnight Date as 'YYYY-MM-DD'. */
export function toDateKey(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse 'YYYY-MM-DD' to a UTC-midnight Date. */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Half-open range [start, end) covering the given month.
 * Half-open avoids the classic bug of an inclusive end boundary missing
 * entries timestamped later in the final day. `month` is 1-12.
 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** Number of days in the given month. `month` is 1-12. */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
