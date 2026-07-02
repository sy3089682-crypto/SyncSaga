import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@syncsaga/config';
import { logger } from './logger';

const env = getEnv();

/**
 * Supabase admin client — uses service role key.
 * This client bypasses RLS and should ONLY be used for:
 * - Verifying JWT tokens (auth verification)
 * - Admin operations (moderation, audit)
 * - Webhook handlers (Stripe, etc.)
 *
 * NEVER expose this client to the frontend.
 * NEVER use it for user-facing CRUD operations — those go through
 * the user's own Supabase session token with RLS enforcement.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Backward-compatible alias. Many modules import `{ supabase }` from here.
 * This is the admin client — see the warning above.
 */
export const supabase = supabaseAdmin;

/**
 * Anon client for token verification.
 * Created once and reused — not per-request.
 */
const anonClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Verify a Supabase JWT access token and return the user ID.
 *
 * Uses the anon client with the user's token in the Authorization header.
 * Supabase's auth.getUser() validates the token server-side.
 *
 * @param token - The access token from the Authorization header
 * @returns The user ID if valid, null if invalid or expired
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  try {
    const { data, error } = await anonClient.auth.getUser(token);

    if (error || !data.user) {
      logger.debug('Token verification failed:', error?.message || 'No user');
      return null;
    }

    return data.user.id;
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
}

/**
 * Fetch a user's profile from the database.
 * Uses the admin client since this is a server-side operation.
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('Failed to fetch user profile:', error);
    return null;
  }

  return data;
}
