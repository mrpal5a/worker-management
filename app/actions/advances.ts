'use server';

import { revalidatePath } from 'next/cache';
import * as repo from '@/lib/repo';
import { toDateKey } from '@/lib/date';

export type ActionResult = { ok: true } | { error: string };

/** Reject anything that is not a number, with a floor of either 0 or a strict >0. */
function parseAmount(raw: FormDataEntryValue | null, allowZero: boolean): string | null {
  const s = String(raw ?? '').trim();
  if (s === '') return allowZero ? '0' : null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  if (!allowZero && n <= 0) return null;
  return s;
}

/**
 * Record a new advance. `openingPaid` — how much the worker had already paid
 * back before this was tracked — becomes the first row in its repayment
 * ledger, dated today, rather than a field on the advance itself: the
 * balance must always come from summing the ledger, never from a second
 * number that could drift out of sync with it.
 */
export async function createAdvance(formData: FormData): Promise<ActionResult> {
  const workerId = String(formData.get('workerId') ?? '').trim();
  const principal = parseAmount(formData.get('principal'), false);
  const monthlyDeduction = parseAmount(formData.get('monthlyDeduction'), false);
  const openingPaid = parseAmount(formData.get('openingPaid'), true);
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!workerId) return { error: 'Pick a worker.' };
  if (principal === null) return { error: 'Advance amount must be a number greater than zero.' };
  if (monthlyDeduction === null) return { error: 'Monthly deduction must be a number greater than zero.' };
  if (openingPaid === null) return { error: 'Amount already paid must be zero or more.' };
  if (Number(openingPaid) > Number(principal)) {
    return { error: 'Amount already paid cannot exceed the advance amount.' };
  }

  const worker = await repo.getWorker(workerId);
  if (!worker) return { error: 'Worker not found.' };

  const advanceId = await repo.insertAdvance({ workerId, principal, monthlyDeduction, note });

  if (Number(openingPaid) > 0) {
    await repo.insertAdvancePayment({
      advanceId,
      paidOn: toDateKey(new Date()),
      amount: openingPaid,
      note: 'Already paid before tracking started',
    });
  }

  revalidatePath('/advances');
  return { ok: true };
}

/** Records one repayment against an advance — the "one click per month" deduction, or a custom entry. */
export async function recordAdvancePayment(
  advanceId: string,
  amountRaw: string,
  dateKey?: string,
): Promise<ActionResult> {
  const amount = parseAmount(amountRaw, false);
  if (amount === null) return { error: 'Amount must be a number greater than zero.' };

  await repo.insertAdvancePayment({
    advanceId,
    paidOn: dateKey || toDateKey(new Date()),
    amount,
    note: null,
  });

  revalidatePath('/advances');
  return { ok: true };
}

/** Removes a mistaken repayment entry. */
export async function deleteAdvancePayment(id: string): Promise<void> {
  await repo.deleteAdvancePayment(id);
  revalidatePath('/advances');
}

/** Removes an advance entirely (e.g. a test/mistaken entry), along with its repayment history. */
export async function deleteAdvance(id: string): Promise<void> {
  await repo.deleteAdvance(id);
  revalidatePath('/advances');
}
