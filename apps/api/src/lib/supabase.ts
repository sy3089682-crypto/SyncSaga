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
 * Verify a Supabase JWT access token and return the user ID.
 *
 * Uses the Supabase Admin API (auth/v1/user) with the service key.
 * This is the correct way to verify tokens server-side with the service key.
 *
 * @param token - The access token from the Authorization header
 * @returns The user ID if valid, null if invalid or expired
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  try {
    logger.debug('Verifying token:', token.slice(0, 20) + '...');
    
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.debug('Token verification failed:', errorText);
      return null;
    }

    const userData = await response.json() as { id: string };
    logger.debug('Token verified for user:', userData.id);
    return userData.id;
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
