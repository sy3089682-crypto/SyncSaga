import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(oauthError)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=Missing%20OAuth%20authorization%20code', origin)
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('OAuth callback: missing Supabase environment variables');
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication%20configuration%20error', origin)
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('OAuth PKCE exchange failed:', exchangeError.message);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, origin)
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('OAuth callback: session user unavailable:', userError?.message);
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication%20session%20could%20not%20be%20created', origin)
    );
  }

  const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.username ||
    username;
  const avatarUrl = user.user_metadata?.avatar_url || null;

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (profileError) {
    // Authentication is already established. A profile problem must not log
    // the user out, but keep the server-side error visible for diagnostics.
    console.warn('OAuth callback: profile upsert failed:', profileError.message);
  }

  const response = NextResponse.redirect(new URL('/dashboard', origin));
  return response;
}
