'use client';

import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar, BottomNav } from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';

function SocketInitializer({ token }: { token: string | null }) {
  useEffect(() => {
    if (!token) return;
    getSocket(token);
  }, [token]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <InnerProviders>{children}</InnerProviders>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function InnerProviders({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return (
    <>
      <SocketInitializer token={token} />
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
        <BottomNav />
      </div>
    </>
  );
}
