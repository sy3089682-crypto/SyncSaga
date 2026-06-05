import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await req.json()
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

  try {
    const { AccessToken } = await import('livekit-server-sdk')
    const { data: profile } = await supabase.from('profiles').select('username,avatar_url').eq('id', user.id).single()
    
    const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
      identity: user.id,
      name: (profile as any)?.username ?? user.email,
      ttl: '2h',
    })
    at.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true })
    const token = await at.toJwt()
    return NextResponse.json({ token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
