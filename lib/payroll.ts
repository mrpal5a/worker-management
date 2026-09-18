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

export interface EntryRates {
  /** Rate snapshot taken when the attendance row was created. */
  payRate: Decimal;
  otHours: Decimal;
}

/**
 * Pay for one full day plus overtime — also what the company that day is
 * owed, since billing mirrors pay exactly.
 *
 * Overtime carries no premium: an OT hour is the plain hourly equivalent of
 * the daily rate, i.e. rate ÷ 8.
 */
export function calcPay(payRate: Decimal, otHours: Decimal): Decimal {
  return payRate.plus(payRate.dividedBy(STANDARD_HOURS).times(otHours));
}

/** Pay for a single attendance entry. */
export function calcEntry(rates: EntryRates): { pay: Decimal } {
  return { pay: calcPay(rates.payRate, rates.otHours) };
}

/** Sum a list of Decimals, returning 0 for an empty list. */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((a, b) => a.plus(b), new Decimal(0));
}
