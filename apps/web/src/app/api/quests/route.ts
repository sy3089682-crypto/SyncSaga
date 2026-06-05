import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  
  // Get user's active quests or assign new ones
  let { data: userQuests } = await supabase
    .from('user_quests')
    .select('*, quest:quests(*)')
    .eq('user_id', user.id)
    .gte('assigned_at', today.toISOString())
    .is('claimed_at', null)

  if (!userQuests || userQuests.length === 0) {
    // Assign daily quests
    const { data: quests } = await supabase.from('quests').select('*').eq('type', 'daily').limit(3)
    if (quests?.length) {
      const inserts = quests.map(q => ({ user_id: user.id, quest_id: q.id, progress: 0 }))
      await supabase.from('user_quests').upsert(inserts, { onConflict: 'user_id,quest_id' })
      const { data: fresh } = await supabase.from('user_quests').select('*, quest:quests(*)').eq('user_id', user.id).gte('assigned_at', today.toISOString())
      userQuests = fresh ?? []
    }
  }

  return NextResponse.json({ quests: userQuests ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { questId } = await req.json()
  
  const { data: uq } = await supabase
    .from('user_quests')
    .select('*, quest:quests(*)')
    .eq('user_id', user.id)
    .eq('quest_id', questId)
    .single()

  if (!uq || !(uq as any).completed_at || (uq as any).claimed_at) {
    return NextResponse.json({ error: 'Quest not claimable' }, { status: 400 })
  }

  const quest = (uq as any).quest
  await supabase.from('user_quests').update({ claimed_at: new Date().toISOString() }).eq('id', uq.id)
  await supabase.rpc('add_xp_and_coins', { p_user_id: user.id, p_xp: quest.xp_reward, p_coins: quest.coin_reward })
  await supabase.from('coin_transactions').insert({ user_id: user.id, amount: quest.coin_reward, type: 'earn', reason: `Quest: ${quest.name}` })

  return NextResponse.json({ success: true, xp: quest.xp_reward, coins: quest.coin_reward })
}
