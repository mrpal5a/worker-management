import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calcPay, calcEntry, sum, STANDARD_HOURS } from './payroll';

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

describe('calcEntry', () => {
  it('computes pay from a rate snapshot', () => {
    const r = calcEntry({ payRate: d(600), otHours: d(2) });
    expect(r.pay.toString()).toBe('750');
  });

  it('doubles pay for a full extra shift of overtime', () => {
    const noOt = calcEntry({ payRate: d(600), otHours: d(0) });
    const withOt = calcEntry({ payRate: d(600), otHours: d(8) });
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
