'use server';

import { revalidatePath } from 'next/cache';
import * as repo from '@/lib/repo';

export type AttendanceResult = { ok: true } | { error: string };

/**
 * Assign a worker to a company for one date, or update an existing assignment.
 *
 * The rate snapshots are taken here, from the rates in force at the moment the
 * entry is recorded. Reporting reads those snapshots, so a later rate change
 * cannot rewrite this day.
 */
export async function setAttendance(
  dateKey: string,
  workerId: string,
  companyId: string,
  otHoursRaw: string,
): Promise<AttendanceResult> {
  const trimmed = (otHoursRaw ?? '').trim();
  const otHours = trimmed === '' ? '0' : trimmed;
  const n = Number(otHours);

  if (!Number.isFinite(n) || n < 0) return { error: 'Overtime must be zero or more.' };
  if (n > 24) return { error: 'Overtime cannot exceed 24 hours in a day.' };

  const [worker, company] = await Promise.all([
    repo.getWorker(workerId),
    repo.getCompany(companyId),
  ]);

  if (!worker) return { error: 'Worker not found.' };
  if (!company) return { error: 'Company not found.' };

  await repo.upsertEntry({
    dateKey,
    workerId,
    companyId,
    otHours,
    payRateSnapshot: String(worker.pay_rate),
  });

  revalidatePath('/attendance');
  return { ok: true };
}

/** Mark absent by removing the row. Absence is the absence of a row. */
export async function clearAttendance(dateKey: string, workerId: string): Promise<void> {
  await repo.deleteEntry(dateKey, workerId);
  revalidatePath('/attendance');
}
