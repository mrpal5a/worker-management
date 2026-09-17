import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calcPay, calcBill, calcMargin, calcEntry, sum, STANDARD_HOURS } from './payroll';

const d = (v: string | number) => new Decimal(v);

describe('calcPay', () => {
  it('pays exactly the day rate when there is no overtime', () => {
    expect(calcPay(d(600), d(0)).toString()).toBe('600');
  });

  it('adds plain hourly for each overtime hour', () => {
    // 600/8 = 75 per hour; 2 hours OT = 150
    expect(calcPay(d(600), d(2)).toString()).toBe('750');
  });

  it('handles fractional overtime hours', () => {
    // 600/8 = 75; 1.5h = 112.5
    expect(calcPay(d(600), d(1.5)).toString()).toBe('712.5');
  });

  it('does not lose precision on rates that do not divide evenly', () => {
    // 500/8 = 62.5; 3h = 187.5 -> 687.5
    expect(calcPay(d(500), d(3)).toString()).toBe('687.5');
  });

  it('returns zero for a zero rate', () => {
    expect(calcPay(d(0), d(5)).toString()).toBe('0');
  });

  it('avoids the floating point error that plain numbers would produce', () => {
    // 0.1 + 0.2 === 0.30000000000000004 as a float.
    // Decimal must give exactly 0.3 worth of overtime on a rate of 2.4:
    // 2.4/8 = 0.3 per hour, 1 hour OT -> 2.7
    expect(calcPay(d('2.4'), d(1)).toString()).toBe('2.7');
  });
});

describe('calcBill', () => {
  it('uses the same formula with the bill rate', () => {
    expect(calcBill(d(800), d(2)).toString()).toBe('1000');
  });

  it('pays exactly the bill rate with no overtime', () => {
    expect(calcBill(d(800), d(0)).toString()).toBe('800');
  });
});

describe('calcMargin', () => {
  it('is bill minus pay', () => {
    expect(calcMargin(d(1000), d(750)).toString()).toBe('250');
  });

  it('can be negative when billing below cost', () => {
    expect(calcMargin(d(500), d(600)).toString()).toBe('-100');
  });
});

describe('calcEntry', () => {
  it('computes pay, bill and margin together from snapshots', () => {
    const r = calcEntry({ payRate: d(600), billRate: d(800), otHours: d(2) });
    expect(r.pay.toString()).toBe('750');
    expect(r.bill.toString()).toBe('1000');
    expect(r.margin.toString()).toBe('250');
  });

  it('keeps margin proportional when only overtime differs', () => {
    const noOt = calcEntry({ payRate: d(600), billRate: d(800), otHours: d(0) });
    const withOt = calcEntry({ payRate: d(600), billRate: d(800), otHours: d(8) });
    // A full extra shift of OT should double both sides.
    expect(withOt.pay.toString()).toBe('1200');
    expect(withOt.bill.toString()).toBe('1600');
    expect(withOt.margin.toString()).toBe(noOt.margin.times(2).toString());
  });
});

describe('sum', () => {
  it('returns zero for an empty list', () => {
    expect(sum([]).toString()).toBe('0');
  });

  it('adds without floating point drift', () => {
    const tenth = d('0.1');
    expect(sum([tenth, tenth, tenth]).toString()).toBe('0.3');
  });
});

describe('reconciliation invariant', () => {
  it('sum of pay plus sum of margin equals sum of bill', () => {
    const entries = [
      { payRate: d(600), billRate: d(800), otHours: d(2) },
      { payRate: d(500), billRate: d(650), otHours: d(0) },
      { payRate: d(450), billRate: d(500), otHours: d('3.5') },
    ].map(calcEntry);

    const totalPay = sum(entries.map((e) => e.pay));
    const totalBill = sum(entries.map((e) => e.bill));
    const totalMargin = sum(entries.map((e) => e.margin));

    expect(totalPay.plus(totalMargin).equals(totalBill)).toBe(true);
  });
});

describe('STANDARD_HOURS', () => {
  it('is 8', () => {
    expect(STANDARD_HOURS.toString()).toBe('8');
  });
});
