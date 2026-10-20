import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_token';

/**
 * Cheap gate for admin pages: no session cookie -> redirect to the login page.
 * The API still verifies the JWT on every admin request, so a forged cookie gets nothing.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  if (pathname === '/admin/login') {
    if (hasSession) return NextResponse.redirect(new URL('/admin', req.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
