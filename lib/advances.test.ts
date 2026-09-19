import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { outstandingBalance, suggestedDeduction } from './advances';

const d = (v: string | number) => new Decimal(v);

describe('outstandingBalance', () => {
  it('is the full principal when nothing has been paid', () => {
    expect(outstandingBalance(d(5000), d(0)).toString()).toBe('5000');
  });

  it('subtracts what has been paid so far', () => {
    expect(outstandingBalance(d(5000), d(2000)).toString()).toBe('3000');
  });

  it('is zero once fully repaid', () => {
    expect(outstandingBalance(d(5000), d(5000)).toString()).toBe('0');
  });

  it('floors at zero rather than going negative on an overpayment', () => {
    expect(outstandingBalance(d(5000), d(5200)).toString()).toBe('0');
  });
});

describe('suggestedDeduction', () => {
  it('suggests the standard monthly amount while plenty remains', () => {
    expect(suggestedDeduction(d(5000), d(0), d(1000)).toString()).toBe('1000');
  });

  it('caps the suggestion to what is actually left owed', () => {
    expect(suggestedDeduction(d(5000), d(4500), d(1000)).toString()).toBe('500');
  });

  it('suggests nothing once the advance is settled', () => {
    expect(suggestedDeduction(d(5000), d(5000), d(1000)).toString()).toBe('0');
  });
});
