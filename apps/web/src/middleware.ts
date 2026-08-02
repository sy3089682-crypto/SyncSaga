import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js Middleware — Authentication Guard
 *
 * This middleware runs on every request and:
 * 1. Refreshes the Supabase session (handles token rotation)
 * 2. Redirects unauthenticated users to /auth/login for protected routes
 * 3. Redirects authenticated users away from auth pages
 *
 * The session is refreshed by passing the cookies through the
 * Supabase client and updating them in the response.
 */

const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
];

const authPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
];

function isPublicPath(pathname: string): boolean {
  // Exact match for public paths
  if (publicPaths.includes(pathname)) return true;
  // Allow API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) return true;
  // Allow embed routes (they handle auth via token)
  if (pathname.startsWith('/embed/')) return true;
  // Allow search routes (public anime browsing)
  if (pathname.startsWith('/search')) return true;
  // Allow static assets
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/icon')) return true;
  if (pathname.startsWith('/manifest')) return true;
  if (pathname.startsWith('/sw.js')) return true;
  return false;
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase env vars are not set, allow the request through.
    // The app will show errors at runtime, but we don't want to
    // block all requests during development/CI.
    return response;
  }

  // Create a Supabase client that reads and updates cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session — this is critical for token rotation.
  // If the access token is expired, Supabase will use the refresh
  // token to get a new one and update the cookies.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = !!session;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|js|css|woff|woff2|ttf|eot|otf|map)$).*)',
  ],
};
