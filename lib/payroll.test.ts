import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calcPay, calcEntry, sum, STANDARD_HOURS, FULL_DAY, HALF_DAY } from './payroll';

const d = (v: string | number) => new Decimal(v);

describe('calcPay', () => {
  it('pays exactly the day rate when there is no overtime', () => {
    expect(calcPay(d(600), d(0), FULL_DAY).toString()).toBe('600');
  });

  it('adds plain hourly for each overtime hour', () => {
    // 600/8 = 75 per hour; 2 hours OT = 150
    expect(calcPay(d(600), d(2), FULL_DAY).toString()).toBe('750');
  });

  it('handles fractional overtime hours', () => {
    // 600/8 = 75; 1.5h = 112.5
    expect(calcPay(d(600), d(1.5), FULL_DAY).toString()).toBe('712.5');
  });

  it('does not lose precision on rates that do not divide evenly', () => {
    // 500/8 = 62.5; 3h = 187.5 -> 687.5
    expect(calcPay(d(500), d(3), FULL_DAY).toString()).toBe('687.5');
  });

  it('returns zero for a zero rate', () => {
    expect(calcPay(d(0), d(5), FULL_DAY).toString()).toBe('0');
  });

  it('avoids the floating point error that plain numbers would produce', () => {
    // 0.1 + 0.2 === 0.30000000000000004 as a float.
    // Decimal must give exactly 0.3 worth of overtime on a rate of 2.4:
    // 2.4/8 = 0.3 per hour, 1 hour OT -> 2.7
    expect(calcPay(d('2.4'), d(1), FULL_DAY).toString()).toBe('2.7');
  });
});

describe('calcPay — half day', () => {
  it('pays half the day rate for a half day with no overtime', () => {
    expect(calcPay(d(600), d(0), HALF_DAY).toString()).toBe('300');
  });

  it('pays overtime at the full-day hourly rate on a half day', () => {
    // 600 × 0.5 = 300, plus 2h × (600/8 = 75) = 150 -> 450
    expect(calcPay(d(600), d(2), HALF_DAY).toString()).toBe('450');
  });

  it('halves an odd rate exactly', () => {
    expect(calcPay(d('777'), d(0), HALF_DAY).toString()).toBe('388.5');
  });
});

describe('calcEntry', () => {
  it('computes pay from a rate snapshot', () => {
    const r = calcEntry({ payRate: d(600), otHours: d(2), dayFraction: FULL_DAY });
    expect(r.pay.toString()).toBe('750');
  });

  it('doubles pay for a full extra shift of overtime', () => {
    const noOt = calcEntry({ payRate: d(600), otHours: d(0), dayFraction: FULL_DAY });
    const withOt = calcEntry({ payRate: d(600), otHours: d(8), dayFraction: FULL_DAY });
    expect(withOt.pay.toString()).toBe('1200');
    expect(withOt.pay.toString()).toBe(noOt.pay.times(2).toString());
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

describe('STANDARD_HOURS', () => {
  it('is 8', () => {
    expect(STANDARD_HOURS.toString()).toBe('8');
  });
});

describe('calcEntry — half day', () => {
  it('passes the day fraction through', () => {
    expect(calcEntry({ payRate: d(800), otHours: d(0), dayFraction: HALF_DAY }).pay.toString()).toBe('400');
  });
});
