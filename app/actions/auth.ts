'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, sessionSecret, SESSION_TTL_MS } from '@/lib/session';
import { verifyCredentials, getProfile } from '@/lib/users';

// A 'use server' module may only export async functions, so the cookie name is
// a local constant. proxy.ts carries its own copy.
const SESSION_COOKIE = 'wm_session';

export async function login(formData: FormData): Promise<{ error: string } | undefined> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };

  const secret = sessionSecret();
  if (!secret) return { error: 'SESSION_SECRET is not set on the server.' };

  const userId = await verifyCredentials(email, password);
  // Deliberately the same message for a wrong password and an unknown address,
  // so the form cannot be used to discover which emails have accounts.
  if (!userId) return { error: 'Wrong email or password.' };

  const profile = await getProfile(userId);
  if (!profile) return { error: 'Wrong email or password.' };
  if (!profile.active) return { error: 'This account has been deactivated.' };

  const token = await createSessionToken(secret, { userId, role: profile.role });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });

  redirect('/attendance');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}
