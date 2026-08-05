import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js Middleware — Authentication Guard + Device Detection
 *
 * 1. Refreshes the Supabase session (handles token rotation)
 * 2. Redirects unauthenticated users to /auth/login for protected routes
 * 3. Redirects authenticated users away from auth pages
 * 4. Sets X-Device-Type header (mobile/tablet/desktop) for responsive UI
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

// Mobile detection patterns
const MOBILE_USER_AGENTS = [
  /Android/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /Mobile/i,  // Generic mobile
];

// Tablet detection (we want to treat tablets more like desktop for hosting)
const TABLET_USER_AGENTS = [
  /iPad/i,
  /Android(?!.*Mobile)/i,  // Android tablet without "Mobile"
  /Silk/i,
];

function isMobileDevice(userAgent: string): boolean {
  return MOBILE_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function isTablet(userAgent: string): boolean {
  return TABLET_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isTablet(userAgent)) {
    return 'tablet';
  }
  if (isMobileDevice(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

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
  if (pathname.startsWith('/install')) return true;
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

  // Device detection header (for responsive UI)
  const userAgent = request.headers.get('user-agent') || '';
  const deviceType = getDeviceType(userAgent);
  response.headers.set('X-Device-Type', deviceType);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't configured, skip auth guarding (let client handle it)
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and supabase.auth.getUser().
  const { data: { session }, error } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (session && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users to login for protected routes
  // Only redirect if we're sure they're not authenticated (no session AND no error)
  // If there's an error, we don't know their auth state, so don't redirect
  if (!session && !error && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If we couldn't verify (error), don't redirect - let client-side handle it
  if (session) {
    return supabaseResponse;
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
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|js|css|woff|woff2|ttf|eot|otf|map)$).*)',
  ],
};
