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

// The Supabase client is already configured to be server-side. For true connection pooling in production, ensure SUPABASE_URL points to the IPv4 connection pooler (e.g. Supavisor / PgBouncer port 6543).
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
