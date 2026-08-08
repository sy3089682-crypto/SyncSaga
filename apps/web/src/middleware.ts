import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

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

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_vosloQ0c4T1qFmo2bTazKA_pcMa3-tD';

const MOBILE_USER_AGENTS = [
  /Android/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /Mobile/i,
];

const TABLET_USER_AGENTS = [
  /iPad/i,
  /Android(?!.*Mobile)/i,
  /Silk/i,
];

function isMobileDevice(userAgent: string): boolean {
  return MOBILE_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function isTablet(userAgent: string): boolean {
  return TABLET_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isTablet(userAgent)) return 'tablet';
  if (isMobileDevice(userAgent)) return 'mobile';
  return 'desktop';
}

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/embed/')) return true;
  if (pathname.startsWith('/search')) return true;
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

  const userAgent = request.headers.get('user-agent') || '';
  response.headers.set('X-Device-Type', getDeviceType(userAgent));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return response;
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
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

  const { data: { session }, error } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  if (session && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (!session && !error && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session) {
    return supabaseResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|js|css|woff|woff2|ttf|eot|otf|map)$).*)',
  ],
};
