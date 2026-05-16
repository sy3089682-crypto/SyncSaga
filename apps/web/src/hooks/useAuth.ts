'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { User } from '@syncsaga/shared';

export function useAuth() {
  const { user, token, setUser, setToken, logout: storeLogout } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = useAppStore.getState().token;
    if (existingToken) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) setUser(data as User);
          });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setToken(session.access_token);
      } else {
        storeLogout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const register = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: username,
      });
    }
    return data;
  };

  const loginWithGoogle = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });

  const loginWithDiscord = () => supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    storeLogout();
  };

  return { user, token, loading, login, register, loginWithGoogle, loginWithDiscord, logout };
}
