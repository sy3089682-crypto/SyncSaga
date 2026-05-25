import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@syncsaga/config';

const env = getEnv();
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
