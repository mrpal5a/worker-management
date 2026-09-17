import { NextResponse, type NextRequest } from 'next/server';

/**
 * Single shared-password gate. Everything except /login requires the session
 * cookie; hitting /login while already signed in bounces to the app.
 *
 * Next 16 renamed the "middleware" file convention to "proxy".
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.get('wm_session')?.value === 'ok';
  const onLogin = request.nextUrl.pathname === '/login';

  if (!signedIn && !onLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (signedIn && onLogin) {
    return NextResponse.redirect(new URL('/attendance', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
