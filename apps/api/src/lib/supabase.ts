import { createClient } from '@supabase/supabase-js';
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
 * Verify a Supabase JWT access token and return the user ID.
 *
 * This replaces the custom JWT verification system.
 * The token is a Supabase Auth session token, signed by Supabase's
 * JWT secret. We verify it by calling supabase.auth.getUser()
 * which validates the token server-side.
 *
 * @param token - The access token from the Authorization header
 * @returns The user ID if valid, null if invalid or expired
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  try {
    // Create a temporary client with the user's token to verify it
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await client.auth.getUser();

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
