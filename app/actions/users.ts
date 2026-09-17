'use server';

import { revalidatePath } from 'next/cache';
import { currentSession } from '@/lib/current-user';
import { assertAdmin } from '@/lib/auth';
import * as users from '@/lib/users';
import type { Role } from '@/lib/session';

export type UserResult = { ok: true } | { error: string };

const MIN_PASSWORD = 8;

function parseRole(raw: FormDataEntryValue | null): Role | null {
  const value = String(raw ?? 'user');
  return value === 'admin' || value === 'user' ? value : null;
}

export async function addUser(formData: FormData): Promise<UserResult> {
  // The proxy guards navigation, but this action can be invoked directly over
  // HTTP without passing through it. This check is the real boundary.
  assertAdmin(await currentSession());

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const role = parseRole(formData.get('role'));

  if (!email) return { error: 'Email is required.' };
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (!role) return { error: 'Invalid role.' };

  const result = await users.createAccount({ email, password, name, role });
  if ('error' in result) return result;

  revalidatePath('/users');
  return { ok: true };
}

export async function resetPassword(userId: string, formData: FormData): Promise<UserResult> {
  assertAdmin(await currentSession());

  const password = String(formData.get('password') ?? '');
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  await users.setPassword(userId, password);
  return { ok: true };
}

export async function toggleUser(userId: string, active: boolean): Promise<UserResult> {
  const session = assertAdmin(await currentSession());

  // Without this an admin could deactivate themselves and, if they were the
  // only one, lock every administrator out of the system permanently.
  if (session.userId === userId) {
    return { error: 'You cannot deactivate your own account.' };
  }

  if (!active && (await users.countActiveAdmins()) <= 1) {
    const target = await users.getProfile(userId);
    if (target?.role === 'admin') {
      return { error: 'This is the last active admin. Promote someone else first.' };
    }
  }

  await users.setProfile(userId, { active });
  revalidatePath('/users');
  return { ok: true };
}

export async function changeRole(userId: string, role: Role): Promise<UserResult> {
  const session = assertAdmin(await currentSession());

  if (session.userId === userId) {
    return { error: 'You cannot change your own role.' };
  }

  if (role === 'user' && (await users.countActiveAdmins()) <= 1) {
    const target = await users.getProfile(userId);
    if (target?.role === 'admin') {
      return { error: 'This is the last active admin. Promote someone else first.' };
    }
  }

  await users.setProfile(userId, { role });
  revalidatePath('/users');
  return { ok: true };
}
