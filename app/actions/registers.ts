'use server';

import { revalidatePath } from 'next/cache';
import * as repo from '@/lib/repo';

/** Reject anything that is not a non-negative number. */
function parseRate(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return s;
}

export type ActionResult = { ok: true } | { error: string };

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

export async function createWorker(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const payRate = parseRate(formData.get('payRate'));

  if (!name) return { error: 'Name is required.' };
  if (payRate === null) return { error: 'Day rate must be a number, zero or more.' };

  await repo.insertWorker({ name, phone, payRate });
  revalidatePath('/workers');
  return { ok: true };
}

export async function editWorker(id: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const payRate = parseRate(formData.get('payRate'));

  if (!name) return { error: 'Name is required.' };
  if (payRate === null) return { error: 'Day rate must be a number, zero or more.' };

  await repo.updateWorker(id, { name, phone, payRate });
  revalidatePath('/workers');
  return { ok: true };
}

/**
 * Deactivate rather than delete. Deleting would orphan attendance rows and
 * corrupt months already closed.
 */
export async function toggleWorker(id: string, active: boolean): Promise<void> {
  await repo.setWorkerActive(id, active);
  revalidatePath('/workers');
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function createCompany(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const billRate = parseRate(formData.get('billRate'));

  if (!name) return { error: 'Name is required.' };
  if (billRate === null) return { error: 'Bill rate must be a number, zero or more.' };

  await repo.insertCompany({ name, billRate });
  revalidatePath('/companies');
  return { ok: true };
}

export async function editCompany(id: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const billRate = parseRate(formData.get('billRate'));

  if (!name) return { error: 'Name is required.' };
  if (billRate === null) return { error: 'Bill rate must be a number, zero or more.' };

  await repo.updateCompany(id, { name, billRate });
  revalidatePath('/companies');
  return { ok: true };
}

export async function toggleCompany(id: string, active: boolean): Promise<void> {
  await repo.setCompanyActive(id, active);
  revalidatePath('/companies');
}
