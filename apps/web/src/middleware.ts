import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const deviceType = getDeviceType(userAgent);
  
  // Add device type header for use in components
  const response = NextResponse.next();
  response.headers.set('X-Device-Type', deviceType);
  
  // For mobile devices, redirect landing page to mobile-optimized flow
  if (deviceType === 'mobile' && pathname === '/') {
    const url = request.nextUrl.clone();
    url.searchParams.set('mobile', 'true');
    return NextResponse.rewrite(url);
  }
  
  // For mobile, redirect old room URLs to mobile-friendly versions
  if (deviceType === 'mobile' && pathname.startsWith('/room/')) {
    // The room page itself handles mobile rendering
    // Just add a header for client-side detection
  }
  
  // Handle PWA install prompt
  if (deviceType === 'mobile' && pathname === '/install') {
    // Show install instructions
  }
  
  return response;
}

export const config = {
  matcher: [
    '/',
    '/room/:path*',
    '/install',
    '/auth/:path*',
  ],
};
