import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@syncsaga/config';

function getSupabaseConfig() {
  try {
    const env = getEnv();
    return { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY };
  } catch {
    return { url: 'https://placeholder.supabase.co', key: 'placeholder-key' };
  }
}

const { url: supabaseUrl, key: supabaseServiceKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
