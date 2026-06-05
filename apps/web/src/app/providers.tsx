'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar, BottomNav } from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { ToastProvider } from '@/hooks/useToast';
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111111',
              color: '#fafafa',
              border: '1px solid #1f1f1f',
            },
          }}
        />
        <ErrorBoundary>
          <AuthGuard>
            <ToastProvider>
              <InnerProviders>{children}</InnerProviders>
            </ToastProvider>
          </AuthGuard>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function InnerProviders({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const palette = useCommandPalette();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      import('@/lib/analytics').then(({ analytics }) => analytics.init(user.id));
    }
  }, [user?.id]);

  return (
    <>
      <SocketInitializer token={token || null} />
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
