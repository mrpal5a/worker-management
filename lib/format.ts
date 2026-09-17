import Decimal from 'decimal.js';

/** Format as Indian rupees with two decimals. */
export function money(v: Decimal): string {
  return '₹' + v.toFixed(2);
}

/** Overtime hours, with a dash for none so tables stay readable. */
export function hours(v: Decimal): string {
  return v.isZero() ? '—' : v.toString();
}

/** Current year and month (1-12), in UTC to match how dates are stored. */
export function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}
