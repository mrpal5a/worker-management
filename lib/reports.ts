import Decimal from 'decimal.js';
import { calcEntry, sum } from './payroll';

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
  /** Snapshot taken when the entry was recorded, not the current rate. */
  billRate: Decimal;
  otHours: Decimal;
}

export interface Bucket {
  id: string;
  name: string;
  days: number;
  otHours: Decimal;
  pay: Decimal;
  bill: Decimal;
  margin: Decimal;
}

export interface Aggregated {
  byWorker: Map<string, Bucket>;
  byCompany: Map<string, Bucket>;
  totals: { pay: Decimal; bill: Decimal; margin: Decimal; days: number };
}

function emptyBucket(id: string, name: string): Bucket {
  return {
    id,
    name,
    days: 0,
    otHours: new Decimal(0),
    pay: new Decimal(0),
    bill: new Decimal(0),
    margin: new Decimal(0),
  };
}

function accumulate(
  b: Bucket,
  otHours: Decimal,
  pay: Decimal,
  bill: Decimal,
  margin: Decimal,
): void {
  b.days += 1;
  b.otHours = b.otHours.plus(otHours);
  b.pay = b.pay.plus(pay);
  b.bill = b.bill.plus(bill);
  b.margin = b.margin.plus(margin);
}

/** Group rows into per-worker and per-company totals. */
export function aggregate(rows: ReportRow[]): Aggregated {
  const byWorker = new Map<string, Bucket>();
  const byCompany = new Map<string, Bucket>();

  for (const r of rows) {
    const { pay, bill, margin } = calcEntry({
      payRate: r.payRate,
      billRate: r.billRate,
      otHours: r.otHours,
    });

    if (!byWorker.has(r.workerId)) {
      byWorker.set(r.workerId, emptyBucket(r.workerId, r.workerName));
    }
    if (!byCompany.has(r.companyId)) {
      byCompany.set(r.companyId, emptyBucket(r.companyId, r.companyName));
    }

    accumulate(byWorker.get(r.workerId)!, r.otHours, pay, bill, margin);
    accumulate(byCompany.get(r.companyId)!, r.otHours, pay, bill, margin);
  }

  // Totals are derived from the worker buckets; every row lands in exactly one
  // worker bucket and one company bucket, so either side gives the same sum.
  const all = [...byWorker.values()];

  return {
    byWorker,
    byCompany,
    totals: {
      pay: sum(all.map((b) => b.pay)),
      bill: sum(all.map((b) => b.bill)),
      margin: sum(all.map((b) => b.margin)),
      days: all.reduce((a, b) => a + b.days, 0),
    },
  };
}
