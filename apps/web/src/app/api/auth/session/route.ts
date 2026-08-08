import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_vosloQ0c4T1qFmo2bTazKA_pcMa3-tD';

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ session: null }, { status: 503 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json(
    { session: null },
    { headers: { 'Cache-Control': 'no-store, private' } }
  );

  const supabase = createServerClient(supabaseUrl, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return response;

  const finalResponse = NextResponse.json(
    {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
    },
    { headers: { 'Cache-Control': 'no-store, private' } }
  );

  return copyCookies(response, finalResponse);
}
