import Decimal from 'decimal.js';

/**
 * Every money calculation in the app lives here.
 *
 * These functions are deliberately pure: they take plain values and return
 * plain values, with no database access and no imports from Prisma or Next.
 * That is what lets the money logic — the part that must be correct — be
 * tested exhaustively without fixtures or a running database.
 *
 * All values are Decimal, never number. Binary floats cannot represent
 * decimal fractions exactly, and across ~2,100 entries a month the rounding
 * error accumulates into totals that do not reconcile.
 *
 * A company has no rate of its own: what it owes for one man-day is exactly
 * what the worker who came was paid for that day. There is deliberately no
 * separate "bill rate" and no margin — the contractor is a pass-through, not
 * a markup on top of a worker's wage.
 */

/** A standard working day. Overtime is paid per hour beyond this. */
export const STANDARD_HOURS = new Decimal(8);

/** Share of the day rate earned for a full day and for a half day. */
export const FULL_DAY = new Decimal(1);
export const HALF_DAY = new Decimal('0.5');

export interface EntryRates {
  /** Rate snapshot taken when the attendance row was created. */
  payRate: Decimal;
  otHours: Decimal;
  /** 1 for a full day, 0.5 for a half day. */
  dayFraction: Decimal;
}

/**
 * Pay for one day plus overtime — also what the company that day is owed,
 * since billing mirrors pay exactly.
 *
 * A half day earns half the day rate (`dayFraction` 0.5). Overtime carries no
 * premium and is unaffected by a half day: an OT hour is the plain hourly
 * equivalent of the full daily rate, i.e. rate ÷ 8.
 *
 * `dayFraction` is required rather than defaulted so that no caller can
 * silently pay a half day as a full one.
 */
export function calcPay(payRate: Decimal, otHours: Decimal, dayFraction: Decimal): Decimal {
  return payRate.times(dayFraction).plus(payRate.dividedBy(STANDARD_HOURS).times(otHours));
}

/** Pay for a single attendance entry. */
export function calcEntry(rates: EntryRates): { pay: Decimal } {
  return { pay: calcPay(rates.payRate, rates.otHours, rates.dayFraction) };
}

/** Sum a list of Decimals, returning 0 for an empty list. */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((a, b) => a.plus(b), new Decimal(0));
}
