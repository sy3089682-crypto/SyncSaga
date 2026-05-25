'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { analytics } from '@/lib/analytics';

export function useAnalytics() {
  const pathname = usePathname();
  const user = useAppStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    analytics.init(user.id);
    analytics.identify(user.id, {
      username: user.username,
      email: user.email,
    });
  }, [user?.id]);

  useEffect(() => {
    if (pathname) analytics.pageview(pathname);
  }, [pathname]);
}
