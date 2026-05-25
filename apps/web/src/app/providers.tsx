'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar, BottomNav } from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { ToastProvider } from '@/hooks/useToast';
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function SocketInitializer({ token }: { token: string | null }) {
  useEffect(() => {
    if (!token) return;
    getSocket(token);
  }, [token]);
  return null;
}

function GlobalShortcuts({ onTogglePalette }: { onTogglePalette: () => void }) {
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, handler: onTogglePalette },
    { key: 'p', ctrl: true, shift: true, handler: onTogglePalette },
  ]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <ToastProvider>
          <InnerProviders>{children}</InnerProviders>
        </ToastProvider>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function InnerProviders({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const palette = useCommandPalette();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      import('@/lib/analytics').then(({ analytics }) => analytics.init(user.id));
    }
  }, [user?.id]);

  return (
    <>
      <SocketInitializer token={token} />
      <GlobalShortcuts onTogglePalette={palette.toggle} />
      <CommandPalette open={palette.open} onClose={palette.close} />
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
        <BottomNav />
      </div>
    </>
  );
}
