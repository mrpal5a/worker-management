import Decimal from 'decimal.js';
import { calcPay, sum } from './payroll';

/**
 * Month-end aggregation.
 *
 * `aggregate` is pure — it takes rows and returns totals, with no database
 * access — so the reporting logic is testable without a database. Loading the
 * rows is lib/repo.ts's job.
 */

export interface ReportRow {
  dateKey: string;
  workerId: string;
  workerName: string;
  companyId: string;
  companyName: string;
  /** Snapshot taken when the entry was recorded, not the current rate. */
  payRate: Decimal;
  otHours: Decimal;
  /** 1 for a full day, 0.5 for a half day. */
  dayFraction: Decimal;
}

export interface Bucket {
  id: string;
  name: string;
  /** Days worked, counting a half day as 0.5. */
  days: number;
  otHours: Decimal;
  /**
   * What was paid the worker — and, in the company bucket, exactly what that
   * company owes for the same day, since billing mirrors pay.
   */
  pay: Decimal;
}

export interface Aggregated {
  byWorker: Map<string, Bucket>;
  byCompany: Map<string, Bucket>;
  totals: { pay: Decimal; days: number };
}

function emptyBucket(id: string, name: string): Bucket {
  return {
    id,
    name,
    days: 0,
    otHours: new Decimal(0),
    pay: new Decimal(0),
  };
}

function accumulate(b: Bucket, dayFraction: Decimal, otHours: Decimal, pay: Decimal): void {
  b.days += dayFraction.toNumber();
  b.otHours = b.otHours.plus(otHours);
  b.pay = b.pay.plus(pay);
}

/** Group rows into per-worker and per-company totals. */
export function aggregate(rows: ReportRow[]): Aggregated {
  const byWorker = new Map<string, Bucket>();
  const byCompany = new Map<string, Bucket>();

  for (const r of rows) {
    const pay = calcPay(r.payRate, r.otHours, r.dayFraction);

    if (!byWorker.has(r.workerId)) {
      byWorker.set(r.workerId, emptyBucket(r.workerId, r.workerName));
    }
    if (!byCompany.has(r.companyId)) {
      byCompany.set(r.companyId, emptyBucket(r.companyId, r.companyName));
    }

    accumulate(byWorker.get(r.workerId)!, r.dayFraction, r.otHours, pay);
    accumulate(byCompany.get(r.companyId)!, r.dayFraction, r.otHours, pay);
  }

  // Totals are derived from the worker buckets; every row lands in exactly one
  // worker bucket and one company bucket, so either side gives the same sum.
  const all = [...byWorker.values()];

  return {
    byWorker,
    byCompany,
    totals: {
      pay: sum(all.map((b) => b.pay)),
      days: all.reduce((a, b) => a + b.days, 0),
    },
  };
}
