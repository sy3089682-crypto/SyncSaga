'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { LoadingSpinner } from '@/components/ui/Loading';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const oauthError = searchParams.get('error_description') || searchParams.get('error');
        if (oauthError) {
          throw new Error(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        }

        // Supabase SSR uses the PKCE flow. exchangeCodeForSession expects the
        // OAuth `code` value, not the full callback URL.
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) throw new Error('OAuth session was not created. Please try signing in again.');

        if (cancelled) return;

        setUser(session.user);

        // Create the profile if this is the user's first OAuth login. Upsert
        // prevents a race/duplicate insert from breaking the login flow.
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: session.user.id,
            username: session.user.email?.split('@')[0] || `user_${session.user.id.slice(0, 8)}`,
            display_name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0] ||
              'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

        // A profile write must not invalidate an otherwise valid OAuth session.
        // Surface it for debugging, but continue to the dashboard.
        if (profileError) {
          console.warn('Unable to create/update profile after OAuth login:', profileError);
        }

        router.replace('/dashboard');
      } catch (error) {
        console.error('OAuth callback failed:', error);
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Authentication failed';
          router.replace(`/auth/login?error=${encodeURIComponent(message)}`);
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, setUser]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)' }}>
          Completing sign in…
        </p>
      </div>
    </div>
  );
}
