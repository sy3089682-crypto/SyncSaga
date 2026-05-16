'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';

const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/callback'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !publicPaths.includes(pathname)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
