'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { LoadingSpinner } from '@/components/ui/Loading';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    const handleCallback = async () => {
      // Exchange code for session if present (OAuth PKCE)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        typeof window !== 'undefined' ? window.location.href : ''
      ).catch(() => ({ error: null }));

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push('/auth/login?error=Auth%20failed');
        return;
      }

      // Cache Supabase user for UI (token lives in Supabase session / useAuth)
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          username: session.user.email?.split('@')[0] || 'user',
          display_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.username ||
            session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      }

      router.push('/dashboard');
    };

    handleCallback();
  }, [router, setUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-text-secondary">Completing sign in...</p>
      </div>
    </div>
  );
}
