import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

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

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (TABLET_USER_AGENTS.some((pattern) => pattern.test(userAgent))) return 'tablet';
  if (MOBILE_USER_AGENTS.some((pattern) => pattern.test(userAgent))) return 'mobile';
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
  return authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    'X-Device-Type',
    getDeviceType(request.headers.get('user-agent') ?? '')
  );

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || isPublicPath(pathname)) {
    return response;
  }

  let supabaseResponse = response;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() validates the JWT with Supabase and refreshes the session when needed.
  // Do not use getSession() as the server-side source of truth.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Middleware auth verification failed:', error.message);
  }

  if (user && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && !error) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|js|css|woff|woff2|ttf|eot|otf|map)$).*)',
  ],
};
