import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // 1. Define your page types
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isProtectedPage = pathname.startsWith('/dashboard') || pathname.startsWith('/groups');

  // 2. BREAK THE LOOP: If we are already on an auth page, don't do anything
  if (isAuthPage) {
    if (token) {
      // If they HAVE a token, they shouldn't be here. Send to dashboard.
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // If NO token, just stay here. Do NOT redirect.
    return NextResponse.next();
  }

  // 3. PROTECTED ROUTES: If no token, go to login
  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // This tells Next.js NOT to run the middleware on images, icons, or api calls
  matcher: ['/((?!api|_next/static|_next/image|Images|favicon.ico).*)'],
};