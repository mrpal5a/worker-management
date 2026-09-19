import Decimal from 'decimal.js';

/**
 * Advance-balance arithmetic lives here, pure and separate from lib/repo.ts,
 * for the same reason lib/payroll.ts is pure: it is the part that must be
 * correct, so it needs to be testable without a database.
 *
 * The balance is never stored — it is always principal minus every payment
 * recorded against the advance, computed fresh each time. That is what makes
 * the ledger (lib/repo.ts's advance_payments rows) the only source of truth.
 */

/** Outstanding balance, floored at zero so an accidental overpayment never displays as negative. */
export function outstandingBalance(principal: Decimal, paid: Decimal): Decimal {
  const balance = principal.minus(paid);
  return balance.isNegative() ? new Decimal(0) : balance;
}

/** What the next monthly deduction should be — the standard amount, capped to what's left owed. */
export function suggestedDeduction(principal: Decimal, paid: Decimal, monthlyDeduction: Decimal): Decimal {
  return Decimal.min(monthlyDeduction, outstandingBalance(principal, paid));
}
