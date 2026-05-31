import { Router, Request, Response } from 'express';
import { getEnv } from '@syncsaga/config';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';
import { logger } from '../lib/logger';

const router = Router();
const env = getEnv();

function requireAuth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return null;
  }
  return decoded.userId;
}

const PLANS = {
  free: { name: 'Free', price: 0, maxRooms: 3, maxMembersPerRoom: 10, hdRooms: false, aiFeatures: false, clips: false },
  premium: { name: 'Premium', price: 499, maxRooms: 20, maxMembersPerRoom: 50, hdRooms: true, aiFeatures: true, clips: true },
  pro: { name: 'Pro', price: 999, maxRooms: 100, maxMembersPerRoom: 100, hdRooms: true, aiFeatures: true, clips: true },
};

router.get('/plans', (_req: Request, res: Response) => {
  res.json({ plans: PLANS });
});

router.get('/subscription', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return res.json({ subscription: { plan: 'free', status: 'active' } });
  }

  const plan = PLANS[data.plan as keyof typeof PLANS] || PLANS.free;
  res.json({ subscription: { ...data, planDetails: plan } });
});

router.post('/create-checkout', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { priceId, successUrl, cancelUrl } = req.body;

  if (!env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: { code: 'NOT_CONFIGURED', message: 'Payments not configured' } });
  }

  try {
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'active',
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.origin}/settings?payment=success`,
      cancel_url: cancelUrl || `${req.headers.origin}/settings?payment=cancelled`,
      metadata: { userId },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    logger.error(error, 'Stripe checkout error:');
    const msg = error instanceof Error ? error.message : 'Checkout error';
    res.status(500).json({ error: { code: 'PAYMENT_ERROR', message: msg } });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(501).json({ error: 'Webhook not configured' });
  }

  try {
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.line_items?.data?.[0]?.price?.nickname?.toLowerCase() || 'premium';

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: session.subscription,
          plan,
          status: 'active',
          current_period_start: new Date().toISOString(),
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;

        await supabase.from('subscriptions').update({
          status: subscription.status === 'active' ? 'active' : 'cancelled',
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId = invoice.metadata.userId;

        await supabase.from('subscriptions').update({
          status: 'past_due',
        }).eq('stripe_customer_id', invoice.customer);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(error, 'Stripe webhook error:');
    const msg = error instanceof Error ? error.message : 'Webhook error';
    res.status(400).json({ error: msg });
  }
});

router.post('/portal', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (!env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: { code: 'NOT_CONFIGURED', message: 'Payments not configured' } });
  }

  try {
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' } });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.headers.origin}/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error(error, 'Stripe portal error:');
    const msg = error instanceof Error ? error.message : 'Portal error';
    res.status(500).json({ error: { code: 'PORTAL_ERROR', message: msg } });
  }
});

router.get('/limits', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { data } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const plan = (data?.plan as keyof typeof PLANS) || 'free';
  const limits = PLANS[plan] || PLANS.free;

  res.json({ plan, limits });
});

export default router;
