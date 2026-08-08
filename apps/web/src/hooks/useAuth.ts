'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getAccessToken } from '@/lib/supabase';

export type AppUser = User & {
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

interface AuthState {
  user: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

async function restoreSessionFromServer(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-store' },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const session = payload?.session as Session | null;
    if (!session?.access_token || !session?.refresh_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return error ? null : data.session;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const applySession = (session: Session | null) => {
      if (!mounted) return;
      setState({
        user: session?.user ? (session.user as AppUser) : null,
        accessToken: session?.access_token || null,
        loading: false,
        error: null,
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    async function init() {
      try {
        let {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // In an installed PWA the standalone client can start before the
        // browser-side cookie adapter has rehydrated. Ask the SSR side for the
        // authenticated session, then persist it into the browser client.
        if (!session && !error) {
          session = await restoreSessionFromServer();
        }

        if (!session && !error) {
          const refreshed = await supabase.auth.refreshSession();
          session = refreshed.data.session;
          error = refreshed.error;
        }

        if (!mounted) return;

        if (error) {
          setState({
            user: null,
            accessToken: null,
            loading: false,
            error: error.message,
          });
          return;
        }

        applySession(session);
      } catch (error) {
        if (!mounted) return;
        setState({
          user: null,
          accessToken: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to restore session',
        });
      }
    }

    void init();

    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) applySession(data.session);
        else if (!data.session) {
          const restored = await restoreSessionFromServer();
          if (restored) applySession(restored);
        }
      } catch {
        // Keep the current session state if refresh is temporarily unavailable.
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(error.message);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setState({ user: null, accessToken: null, loading: false, error: null });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, []);

  const refreshToken = useCallback(async () => {
    const token = await getAccessToken();
    setState((prev) => ({ ...prev, accessToken: token }));
    return token;
  }, []);

  return {
    user: state.user,
    accessToken: state.accessToken,
    token: state.accessToken,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    signIn,
    signUp,
    signOut,
    logout: signOut,
    resetPassword,
    updatePassword,
    refreshToken,
  };
}
