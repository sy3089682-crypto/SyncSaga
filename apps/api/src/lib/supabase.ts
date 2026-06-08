import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@syncsaga/config';
import { logger } from './logger';

function getSupabaseConfig() {
  if (process.env.NODE_ENV === 'test') {
    return {
      url: process.env.SUPABASE_URL || 'https://test.supabase.co',
      key: process.env.SUPABASE_SERVICE_KEY || 'test-service-key',
    };
  }

  const env = getEnv();
  
  // High Concurrency: If a specific POOL_URL is provided, we should prefer it for server-side instantiations
  // Since we rely on REST via @supabase/supabase-js, pooling configuration generally happens at the Database (Postgres) connection layer.
  // However, for systems issuing heavy read/writes, we document the usage of PostgREST pointing to a pooled cluster.
  
  return { 
    url: process.env.SUPABASE_POOL_URL || env.SUPABASE_URL, 
    key: env.SUPABASE_SERVICE_KEY 
  };
}

const { url: supabaseUrl, key: supabaseServiceKey } = getSupabaseConfig();

if (process.env.SUPABASE_POOL_URL) {
  logger.info('Supabase client initialized via Connection Pool URL.');
}

// The Supabase client is configured to be server-side. For true connection pooling in production, 
// ensure SUPABASE_POOL_URL points to the IPv4 connection pooler (e.g. Supavisor / PgBouncer port 6543) if directly querying pg.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    // Increase default fetch timeouts for heavy analytics queries running through REST
    fetch: (...args) => fetch(args[0], { ...args[1], keepalive: true }),
  }
});
