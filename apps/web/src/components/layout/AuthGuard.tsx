'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';

const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname?.startsWith('/auth/');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublic) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, isPublic, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
