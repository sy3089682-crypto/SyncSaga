import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@syncsaga/config';

function getSupabaseConfig() {
  if (process.env.NODE_ENV === 'test') {
    return {
      url: process.env.SUPABASE_URL || 'https://test.supabase.co',
      key: process.env.SUPABASE_SERVICE_KEY || 'test-service-key',
    };
  }

  const env = getEnv();
  return { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY };
}

const { url: supabaseUrl, key: supabaseServiceKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
