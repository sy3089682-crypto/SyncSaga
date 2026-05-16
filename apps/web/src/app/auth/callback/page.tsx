'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { LoadingSpinner } from '@/components/ui/Loading';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAppStore(s => s.setUser);
  const setToken = useAppStore(s => s.setToken);

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/auth/login?error=Auth failed');
        return;
      }

      setToken(session.access_token);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUser(profile);
      } else {
        await supabase.from('profiles').insert({
          id: session.user.id,
          username: session.user.email?.split('@')[0] || 'user',
          display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      }

      router.push('/dashboard');
    };

    handleCallback();
  }, [router, setUser, setToken]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-text-secondary">Completing sign in...</p>
      </div>
    </div>
  );
}
