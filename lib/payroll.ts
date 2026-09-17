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
 */

/** A standard working day. Overtime is paid per hour beyond this. */
export const STANDARD_HOURS = new Decimal(8);

export interface EntryRates {
  /** Rate snapshot taken when the attendance row was created. */
  payRate: Decimal;
  /** Rate snapshot taken when the attendance row was created. */
  billRate: Decimal;
  otHours: Decimal;
}

export interface EntryAmounts {
  pay: Decimal;
  bill: Decimal;
  margin: Decimal;
}

/**
 * Pay for one full day plus overtime.
 *
 * Overtime carries no premium: an OT hour is the plain hourly equivalent of
 * the daily rate, i.e. rate ÷ 8.
 */
export function calcPay(payRate: Decimal, otHours: Decimal): Decimal {
  return payRate.plus(payRate.dividedBy(STANDARD_HOURS).times(otHours));
}

/** Billing for one full day plus overtime. Mirrors calcPay exactly. */
export function calcBill(billRate: Decimal, otHours: Decimal): Decimal {
  return billRate.plus(billRate.dividedBy(STANDARD_HOURS).times(otHours));
}

/** What the contractor keeps on one man-day. Negative if billing below cost. */
export function calcMargin(bill: Decimal, pay: Decimal): Decimal {
  return bill.minus(pay);
}

/** Pay, bill and margin for a single attendance entry. */
export function calcEntry(rates: EntryRates): EntryAmounts {
  const pay = calcPay(rates.payRate, rates.otHours);
  const bill = calcBill(rates.billRate, rates.otHours);
  return { pay, bill, margin: calcMargin(bill, pay) };
}

/** Sum a list of Decimals, returning 0 for an empty list. */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((a, b) => a.plus(b), new Decimal(0));
}
