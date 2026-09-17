'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// NOTE: a 'use server' module may only export async functions, so the cookie
// name is a local constant rather than an export. middleware.ts carries its
// own copy of this string.
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

  const jar = await cookies();
  jar.set(SESSION_COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/attendance');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}
