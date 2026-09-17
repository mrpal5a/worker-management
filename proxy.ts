import { NextResponse, type NextRequest } from 'next/server';
import { readSessionToken, sessionSecret } from '@/lib/session';

const SESSION_COOKIE = 'wm_session';

/**
 * Authentication and navigation gate.
 *
 * Verifies the signed session cookie by signature and expiry on every request,
 * with no database read. The token is deliberately not compared against a
 * constant — a constant cookie value would be trivially forgeable.
 *
 * The /users role check here is for user experience. The authoritative check
 * lives inside each admin server action, which can be invoked directly over
 * HTTP without passing through this proxy.
 *
 * Next 16 renamed the "middleware" file convention to "proxy".
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? '';
  const session = token ? await readSessionToken(sessionSecret(), token) : null;
  const path = request.nextUrl.pathname;
  const onLogin = path === '/login';

  if (!session && !onLogin) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear a stale or forged cookie so the browser stops resending it.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (session && onLogin) {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }

  if (session && path.startsWith('/users') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
