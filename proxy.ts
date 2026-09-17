import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, sessionSecret } from '@/lib/session';

const SESSION_COOKIE = 'wm_session';

/**
 * Single shared-password gate. Everything except /login requires a valid
 * signed session token; hitting /login while already signed in bounces to the
 * app.
 *
 * The token is verified by HMAC signature and expiry on every request. It is
 * deliberately not compared against a constant — a constant cookie value would
 * be trivially forgeable and would bypass authentication entirely.
 *
 * Next 16 renamed the "middleware" file convention to "proxy".
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? '';
  const signedIn = token ? await verifySessionToken(sessionSecret(), token) : false;
  const onLogin = request.nextUrl.pathname === '/login';

  if (!signedIn && !onLogin) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear a stale or forged cookie so the browser stops resending it.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  if (signedIn && onLogin) {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
