import { createClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(key: string) {
      if (typeof document === 'undefined') return '';
      const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`));
      return match ? match[2] : '';
    },
    set(key: string, value: string, options: any) {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=${value}; path=/; max-age=${options?.maxAge || 31536000}; SameSite=Lax; ${options?.secure ? 'secure;' : ''}`;
    },
    remove(key: string) {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; path=/; max-age=0`;
    },
  },
});

export async function signInWithOAuth(provider: 'google' | 'github' | 'discord') {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: provider === 'google'
        ? { access_type: 'offline', prompt: 'consent' }
        : undefined,
    },
  });
}
