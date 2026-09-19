import 'server-only';
import {
  getSupabase,
  type WorkerRow,
  type CompanyRow,
  type EntryRow,
  type AdvanceRow,
  type AdvancePaymentRow,
} from './supabase';
import { toDecimal } from './num';
import { monthRange, toDateKey, fromDateKey } from './date';
import type { ReportRow } from './reports';

/**
 * Every Supabase query in the app lives here.
 *
 * Keeping data access in one module means the rest of the app talks in domain
 * terms and never touches PostgREST directly — the same boundary that let the
 * database swap from Prisma to Supabase without touching payroll or date logic.
 */

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

export async function listWorkers(includeInactive = false): Promise<WorkerRow[]> {
  let q = getSupabase().from('workers').select('*').order('name');
  if (!includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  fail('listWorkers', error);
  return data ?? [];
}

export async function getWorker(id: string): Promise<WorkerRow | null> {
  const { data, error } = await getSupabase().from('workers').select('*').eq('id', id).maybeSingle();
  fail('getWorker', error);
  return data;
}

export async function insertWorker(input: {
  name: string;
  phone: string | null;
  payRate: string;
}): Promise<void> {
  const { error } = await getSupabase()
    .from('workers')
    .insert({ name: input.name, phone: input.phone, pay_rate: input.payRate });
  fail('insertWorker', error);
}

export async function updateWorker(
  id: string,
  input: { name: string; phone: string | null; payRate: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('workers')
    .update({ name: input.name, phone: input.phone, pay_rate: input.payRate })
    .eq('id', id);
  fail('updateWorker', error);
}

export async function setWorkerActive(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabase().from('workers').update({ active }).eq('id', id);
  fail('setWorkerActive', error);
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function listCompanies(includeInactive = false): Promise<CompanyRow[]> {
  let q = getSupabase().from('companies').select('*').order('name');
  if (!includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  fail('listCompanies', error);
  return data ?? [];
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  const { data, error } = await getSupabase().from('companies').select('*').eq('id', id).maybeSingle();
  fail('getCompany', error);
  return data;
}

export async function insertCompany(input: { name: string }): Promise<void> {
  const { error } = await getSupabase().from('companies').insert({ name: input.name });
  fail('insertCompany', error);
}

export async function updateCompany(id: string, input: { name: string }): Promise<void> {
  const { error } = await getSupabase().from('companies').update({ name: input.name }).eq('id', id);
  fail('updateCompany', error);
}

export async function setCompanyActive(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabase().from('companies').update({ active }).eq('id', id);
  fail('setCompanyActive', error);
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function entriesForDate(dateKey: string): Promise<EntryRow[]> {
  const { data, error } = await getSupabase().from('entries').select('*').eq('date', dateKey);
  fail('entriesForDate', error);
  return data ?? [];
}

/**
 * Create or update one worker's attendance for one date.
 *
 * Rate snapshots are written here from the rates in force right now. The
 * unique (date, worker_id) constraint makes this an upsert on conflict, which
 * is what enforces one company per worker per day.
 */
export async function upsertEntry(input: {
  dateKey: string;
  workerId: string;
  companyId: string;
  otHours: string;
  payRateSnapshot: string;
}): Promise<void> {
  const { error } = await getSupabase().from('entries').upsert(
    {
      date: input.dateKey,
      worker_id: input.workerId,
      company_id: input.companyId,
      ot_hours: input.otHours,
      pay_rate_snapshot: input.payRateSnapshot,
    },
    { onConflict: 'date,worker_id' },
  );
  fail('upsertEntry', error);
}

export async function deleteEntry(dateKey: string, workerId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('entries')
    .delete()
    .eq('date', dateKey)
    .eq('worker_id', workerId);
  fail('deleteEntry', error);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * Load every attendance row in [startKey, endKeyExclusive), joined to worker
 * and company names, as the plain ReportRow shape the pure aggregation works
 * on. Shared by the month and single-day loaders below.
 */
async function loadEntriesBetween(startKey: string, endKeyExclusive: string): Promise<ReportRow[]> {
  const { data, error } = await getSupabase()
    .from('entries')
    .select('*, workers(name), companies(name)')
    .gte('date', startKey)
    .lt('date', endKeyExclusive)
    .order('date');

  fail('loadEntriesBetween', error);

  type Joined = EntryRow & {
    workers: { name: string } | null;
    companies: { name: string } | null;
  };

  return ((data ?? []) as Joined[]).map((e) => ({
    dateKey: e.date,
    workerId: e.worker_id,
    workerName: e.workers?.name ?? '(deleted worker)',
    companyId: e.company_id,
    companyName: e.companies?.name ?? '(deleted company)',
    payRate: toDecimal(e.pay_rate_snapshot),
    otHours: toDecimal(e.ot_hours),
  }));
}

/** Load every attendance row for a month. */
export async function loadMonth(year: number, month: number): Promise<ReportRow[]> {
  const { start, end } = monthRange(year, month);
  return loadEntriesBetween(toDateKey(start), toDateKey(end));
}

/** Load every attendance row for a single day. */
export async function loadDay(dateKey: string): Promise<ReportRow[]> {
  const next = fromDateKey(dateKey);
  next.setUTCDate(next.getUTCDate() + 1);
  return loadEntriesBetween(dateKey, toDateKey(next));
}

// ---------------------------------------------------------------------------
// Advances
// ---------------------------------------------------------------------------

export interface AdvanceWithPayments extends AdvanceRow {
  workers: { name: string } | null;
  advance_payments: AdvancePaymentRow[];
}

/** Every advance, each with its worker's name and its full repayment ledger nested in. */
export async function listAdvances(): Promise<AdvanceWithPayments[]> {
  const { data, error } = await getSupabase()
    .from('advances')
    .select('*, workers(name), advance_payments(*)')
    .order('created_at', { ascending: false });
  fail('listAdvances', error);
  return (data ?? []) as AdvanceWithPayments[];
}

/** Create an advance and return its id, so an opening "already paid" row can be attached to it. */
export async function insertAdvance(input: {
  workerId: string;
  principal: string;
  monthlyDeduction: string;
  note: string | null;
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from('advances')
    .insert({
      worker_id: input.workerId,
      principal: input.principal,
      monthly_deduction: input.monthlyDeduction,
      note: input.note,
    })
    .select('id')
    .single();
  fail('insertAdvance', error);
  return (data as { id: string }).id;
}

export async function insertAdvancePayment(input: {
  advanceId: string;
  paidOn: string;
  amount: string;
  note: string | null;
}): Promise<void> {
  const { error } = await getSupabase().from('advance_payments').insert({
    advance_id: input.advanceId,
    paid_on: input.paidOn,
    amount: input.amount,
    note: input.note,
  });
  fail('insertAdvancePayment', error);
}

/** Removes one repayment record — for correcting a mistaken entry. */
export async function deleteAdvancePayment(id: string): Promise<void> {
  const { error } = await getSupabase().from('advance_payments').delete().eq('id', id);
  fail('deleteAdvancePayment', error);
}

/**
 * Removes an advance entirely — for a mistaken/test entry, not for closing a
 * settled one (a settled advance is kept as history). Its repayment ledger is
 * removed with it via the advance_payments foreign key's ON DELETE CASCADE.
 */
export async function deleteAdvance(id: string): Promise<void> {
  const { error } = await getSupabase().from('advances').delete().eq('id', id);
  fail('deleteAdvance', error);
}
