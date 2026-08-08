'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, getAccessToken } from '@/lib/supabase';

/** App-facing user shape: Supabase auth user + app profile fields. */
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!mounted) return;
      setState({
        user: session?.user ? (session.user as AppUser) : null,
        accessToken: session?.access_token || null,
        loading: false,
        error: null,
      });
    };

    // Subscribe first so a session restored/rotated during startup cannot be missed.
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

        // PWAs can be resumed after the access token expires while the app is
        // suspended. Explicitly refresh once during startup so the restored
        // session is available before protected UI is evaluated.
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

    init();

    // Android PWAs may be suspended for a long time. Refresh the session when
    // the app becomes visible again instead of forcing another login.
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) applySession(data.session);
      } catch {
        // Supabase's normal session state remains the source of truth.
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    []
  );

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
