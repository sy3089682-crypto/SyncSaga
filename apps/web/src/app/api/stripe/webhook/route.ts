import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: any
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const TIER_MAP: Record<string, string> = {
    [process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ?? '']: 'plus',
    [process.env.STRIPE_PLUS_YEARLY_PRICE_ID ?? '']: 'plus',
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '']: 'pro',
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '']: 'pro',
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan
    if (userId && plan) {
      await supabase.from('profiles').update({
        tier: plan,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object
    await supabase.from('profiles').update({
      tier: 'free',
      subscription_status: event.type === 'customer.subscription.paused' ? 'paused' : 'inactive',
    }).eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object
    const priceId = sub.items?.data[0]?.price?.id
    const tier = TIER_MAP[priceId] ?? 'free'
    await supabase.from('profiles').update({
      tier,
      subscription_status: sub.status,
      subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    }).eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
