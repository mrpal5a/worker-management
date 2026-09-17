'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, sessionSecret, SESSION_TTL_MS } from '@/lib/session';

// NOTE: a 'use server' module may only export async functions, so the cookie
// name is a local constant rather than an export. proxy.ts carries its own copy.
const SESSION_COOKIE = 'wm_session';

export async function login(formData: FormData): Promise<{ error: string } | undefined> {
  const password = String(formData.get('password') ?? '');
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return { error: 'APP_PASSWORD is not set on the server.' };
  }
  if (password !== expected) {
    return { error: 'Wrong password.' };
  }

  const secret = sessionSecret();
  if (!secret) {
    return { error: 'No session secret configured on the server.' };
  }

  // A signed, expiring token — not a constant. A constant cookie value would
  // let anyone forge a session by setting the cookie by hand.
  const token = await createSessionToken(secret);

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
