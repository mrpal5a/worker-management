import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { aggregate, type ReportRow } from './reports';

const d = (v: string | number) => new Decimal(v);

const rows: ReportRow[] = [
  { dateKey: '2026-09-01', workerId: 'w1', workerName: 'Ramesh',
    companyId: 'c1', companyName: 'Acme',
    payRate: d(600), billRate: d(800), otHours: d(2) },
  { dateKey: '2026-09-02', workerId: 'w1', workerName: 'Ramesh',
    companyId: 'c2', companyName: 'Globex',
    payRate: d(600), billRate: d(700), otHours: d(0) },
  { dateKey: '2026-09-01', workerId: 'w2', workerName: 'Suresh',
    companyId: 'c1', companyName: 'Acme',
    payRate: d(500), billRate: d(800), otHours: d(0) },
];

describe('aggregate', () => {
  it('totals pay per worker', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.pay.toString()).toBe('1350'); // 750 + 600
    expect(r.byWorker.get('w2')!.pay.toString()).toBe('500');
  });

  it('totals billing per company', () => {
    const r = aggregate(rows);
    expect(r.byCompany.get('c1')!.bill.toString()).toBe('1800'); // 1000 + 800
    expect(r.byCompany.get('c2')!.bill.toString()).toBe('700');
  });

  it('counts days worked per worker', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.days).toBe(2);
    expect(r.byWorker.get('w2')!.days).toBe(1);
  });

  it('counts man-days per company', () => {
    const r = aggregate(rows);
    expect(r.byCompany.get('c1')!.days).toBe(2);
  });

  it('accumulates overtime hours per worker', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.otHours.toString()).toBe('2');
  });

  it('carries names through to the buckets', () => {
    const r = aggregate(rows);
    expect(r.byWorker.get('w1')!.name).toBe('Ramesh');
    expect(r.byCompany.get('c2')!.name).toBe('Globex');
  });

  it('reconciles: total pay + total margin = total bill', () => {
    const r = aggregate(rows);
    expect(r.totals.pay.plus(r.totals.margin).equals(r.totals.bill)).toBe(true);
  });

  it('derives the same grand total from workers and from companies', () => {
    const r = aggregate(rows);
    const viaWorkers = [...r.byWorker.values()].reduce((a, b) => a.plus(b.bill), d(0));
    const viaCompanies = [...r.byCompany.values()].reduce((a, b) => a.plus(b.bill), d(0));
    expect(viaWorkers.equals(viaCompanies)).toBe(true);
  });

  it('returns zero totals for no rows', () => {
    const r = aggregate([]);
    expect(r.totals.pay.toString()).toBe('0');
    expect(r.totals.bill.toString()).toBe('0');
    expect(r.totals.days).toBe(0);
    expect(r.byWorker.size).toBe(0);
    expect(r.byCompany.size).toBe(0);
  });

  it('uses the snapshot rates it is given, not any current rate', () => {
    // Same worker, two days, different snapshots — simulates a mid-month raise.
    const raised: ReportRow[] = [
      { ...rows[0], otHours: d(0), payRate: d(600) },
      { ...rows[0], dateKey: '2026-09-20', otHours: d(0), payRate: d(700) },
    ];
    expect(aggregate(raised).byWorker.get('w1')!.pay.toString()).toBe('1300');
  });
});
