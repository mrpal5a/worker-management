import 'server-only';
import { cookies } from 'next/headers';
import { readSessionToken, sessionSecret, type Session } from './session';

export const SESSION_COOKIE = 'wm_session';

/**
 * The verified session for the current request, or null.
 *
 * Reads the signed cookie and validates it. Server actions call this and pass
 * the result to the predicates in lib/auth.ts.
 */
export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(sessionSecret(), token);
}
