import { NextRequest, NextResponse } from 'next/server';

// This middleware is a UX / defense-in-depth layer, NOT the security
// boundary. The real authorization boundary is the backend: every API
// route is gated by `authenticate` + `authorize`/`checkPermission`
// (see backend/src/middleware). A user who bypasses this middleware
// entirely still cannot read or write anything they're not permitted to,
// because the backend re-validates the session and role/permission on
// every request.
//
// What this DOES do: avoid rendering the dashboard shell (and firing off
// authenticated data requests) for a visitor with no session at all, and
// avoid showing the login/register pages to someone who is already signed
// in. It reads a lightweight, non-secret `ch_session` cookie set by
// lib/store.ts on login/logout — never the actual bearer token, which
// stays in localStorage and is never sent to this middleware.
//
// Admin-only page gating (e.g. /admin) is intentionally NOT duplicated
// here: the admin page's own client-side check already redirects non-admins,
// and — critically — every admin API endpoint independently enforces the
// ADMIN role server-side. Adding a second, subtly different role list here
// would just be another place for the two checks to drift out of sync.

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/sso-callback',
  '/verify-email',
  '/unauthorized',
];

const AUTH_ONLY_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let Next.js internals, static assets, and the API proxy through untouched.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get('ch_session')?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
