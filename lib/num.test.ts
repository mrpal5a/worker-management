import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { toDecimal } from './num';

describe('toDecimal', () => {
  it('converts an integer JSON number', () => {
    expect(toDecimal(600).toString()).toBe('600');
  });

  it('converts a two-decimal JSON number without drift', () => {
    expect(toDecimal(606.07).toString()).toBe('606.07');
  });

  it('converts a string form', () => {
    expect(toDecimal('712.50').toString()).toBe('712.5');
  });

  it('treats null and undefined as zero', () => {
    expect(toDecimal(null).toString()).toBe('0');
    expect(toDecimal(undefined).toString()).toBe('0');
  });

  it('round-trips values through JSON the way PostgREST would', () => {
    // Simulates numeric(12,2) -> JSON number -> back to Decimal.
    const fromApi = JSON.parse('{"pay_rate":1234.56}').pay_rate;
    expect(toDecimal(fromApi).toString()).toBe('1234.56');
  });

  it('produces a Decimal that sums without float error', () => {
    const tenth = toDecimal(0.1);
    const total = tenth.plus(toDecimal(0.2));
    expect(total.toString()).toBe('0.3');
    expect(total.equals(new Decimal('0.3'))).toBe(true);
  });
});
