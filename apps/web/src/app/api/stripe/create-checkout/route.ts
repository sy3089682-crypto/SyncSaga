import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PRICES: Record<string, { monthly: string; yearly: string }> = {
  plus: {
    monthly: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ?? '',
    yearly: process.env.STRIPE_PLUS_YEARLY_PRICE_ID ?? '',
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
  },
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))

  const plan = req.nextUrl.searchParams.get('plan') ?? 'plus'
  const interval = req.nextUrl.searchParams.get('interval') ?? 'monthly'
  const priceId = PRICES[plan]?.[interval as 'monthly' | 'yearly']
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    
    let customerId = (profile as any)?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_id: user.id } })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId } as any).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { user_id: user.id, plan },
    })
    return NextResponse.redirect(session.url!)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
