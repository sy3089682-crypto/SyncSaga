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

/**
 * useAuth — unified authentication hook
 *
 * Uses Supabase Auth exclusively for all auth operations.
 * Session is managed by Supabase (cookie-based, auto-refresh).
 *
 * Compatibility aliases:
 *   - token      → accessToken  (legacy consumers)
 *   - logout     → signOut
 */

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

  // Initialize — get existing session
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          setState({
            user: session.user as AppUser,
            accessToken: session.access_token,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            accessToken: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!mounted) return;
        setState({
          user: null,
          accessToken: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to get session',
        });
      }
    }

    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setState({
        user: session?.user || null,
        accessToken: session?.access_token || null,
        loading: false,
        error: null,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password.
   */
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }, []);

  /**
   * Sign up with email, password, and username.
   * The profile is auto-created by a database trigger on auth.users insert.
   */
  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    []
  );

  /**
   * Sign out — destroys the session on both client and server.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setState({
      user: null,
      accessToken: null,
      loading: false,
      error: null,
    });
  }, []);

  /**
   * Send a password reset email.
   */
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /**
   * Update the user's password (after reset).
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /**
   * Refresh the access token manually.
   * Supabase auto-refreshes, but this is useful before API calls
   * that need a fresh token.
   */
  const refreshToken = useCallback(async () => {
    const token = await getAccessToken();
    setState((prev) => ({ ...prev, accessToken: token }));
    return token;
  }, []);

  return {
    user: state.user,
    accessToken: state.accessToken,
    /** @deprecated use accessToken — kept for backward compatibility */
    token: state.accessToken,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    signIn,
    signUp,
    signOut,
    /** @deprecated use signOut — kept for backward compatibility */
    logout: signOut,
    resetPassword,
    updatePassword,
    refreshToken,
  };
}
