'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client.
 *
 * Uses the modern Supabase publishable key when available. The publishable
 * key is intentionally safe for browser use and can be independently rotated.
 *
 * Auth persistence is explicit because SyncSaga is also installed as a PWA:
 * the standalone app must keep the same Supabase session across launches,
 * refreshes and background/foreground transitions.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_vosloQ0c4T1qFmo2bTazKA_pcMa3-tD';

if (!supabaseUrl) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL');
}

export const supabase: SupabaseClient = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

export async function signInWithOAuth(provider: 'google' | 'discord') {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      queryParams:
        provider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
    },
  });
}

export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}
