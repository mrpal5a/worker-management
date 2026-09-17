import { describe, it, expect } from 'vitest';
import { toDateKey, fromDateKey, monthRange, daysInMonth } from './date';

describe('toDateKey', () => {
  it('formats a UTC-midnight date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date('2026-09-18T00:00:00Z'))).toBe('2026-09-18');
  });

  it('does not shift the day for late-UTC times', () => {
    expect(toDateKey(new Date('2026-09-18T23:59:59Z'))).toBe('2026-09-18');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateKey(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05');
  });
});

describe('fromDateKey', () => {
  it('parses to UTC midnight', () => {
    expect(fromDateKey('2026-09-18').toISOString()).toBe('2026-09-18T00:00:00.000Z');
  });

  it('round-trips with toDateKey', () => {
    expect(toDateKey(fromDateKey('2028-02-29'))).toBe('2028-02-29');
  });

  it('rolls a non-existent date forward, matching JS Date semantics', () => {
    // 2026 is not a leap year, so 29 Feb does not exist.
    expect(toDateKey(fromDateKey('2026-02-29'))).toBe('2026-03-01');
  });
});

describe('monthRange', () => {
  it('returns first day and first day of next month', () => {
    const { start, end } = monthRange(2026, 9);
    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('rolls over the year in December', () => {
    const { end } = monthRange(2026, 12);
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('excludes the last instant of the previous month', () => {
    const { start } = monthRange(2026, 9);
    expect(start.getTime()).toBeGreaterThan(new Date('2026-08-31T23:59:59Z').getTime());
  });
});

describe('daysInMonth', () => {
  it('handles 30-day months', () => {
    expect(daysInMonth(2026, 9)).toBe(30);
  });

  it('handles 31-day months', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it('handles February in a non-leap year', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('handles February in a leap year', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});
