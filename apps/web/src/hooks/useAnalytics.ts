'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analytics, trackPageview } from '@/lib/analytics';

export function useAnalytics(userId?: string | null) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (userId && !initialized.current) {
      initialized.current = true;
      analytics.init(userId);
      analytics.capture('session_start', { userId });
    }
  }, [userId]);

  useEffect(() => {
    if (pathname) {
      trackPageview(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      analytics.capture('session_end');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
