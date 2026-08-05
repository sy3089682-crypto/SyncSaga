import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import * as webpush from 'web-push';
declare module 'web-push';

const router = Router();

// Web push configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@syncsaga.app';

// Validate subscription schema
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

// Initialize web push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Subscribe to push notifications
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { subscription, userId } = req.body;
    
    // Validate subscription
    const validated = subscriptionSchema.parse(subscription);
    
    // Get user from token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    const supabase = supabaseAdmin;
    if (!supabase) {
      return res.status(500).json({ error: 'Auth failed' });
    }
    
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    // Store subscription (in production, store in database)
    // For now, we'll use a simple in-memory store (use Redis in production)
    const subscriptions = req.app.locals.pushSubscriptions || new Map();
    subscriptions.set(user.id, {
      endpoint: validated.endpoint,
      keys: validated.keys,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    req.app.locals.pushSubscriptions = subscriptions;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(400).json({ error: 'Invalid subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;
    
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    const supabase = supabaseAdmin;
    if (!supabase) {
      return res.status(500).json({ error: 'Auth failed' });
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    // Remove subscription
    const subscriptions = req.app.locals.pushSubscriptions || new Map();
    subscriptions.delete(user.id);
    req.app.locals.pushSubscriptions = subscriptions;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(400).json({ error: 'Failed to unsubscribe' });
  }
});

// Verify subscription
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body;
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Push not configured' });
    }
    
    // Test the subscription by sending a silent notification
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'SyncSaga',
        body: 'Connection verified',
        data: { url: '/' },
      }), {
        TTL: 10,
        urgency: 'low',
      });
      res.json({ valid: true });
    } catch (err: any) {
      if (err.statusCode === 410) {
        // Subscription expired
        res.json({ valid: false, expired: true });
      }
      throw err;
    }
  } catch (error) {
    console.error('Push verify error:', error);
    res.status(400).json({ valid: false });
  }
});

// Send push notification (internal use)
export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  options?: {
    url?: string;
    roomId?: string;
    icon?: string;
  }
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Push not configured');
    return false;
  }
  
  const message = JSON.stringify({
    title,
    body,
    icon: options?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: options?.url || '/',
      roomId: options?.roomId,
    },
    actions: options?.url ? [{
      action: 'open',
      title: 'View Room',
    }] : undefined,
    renotify: true,
    tag: options?.roomId || 'syncsaga-notification',
  });
  
  try {
    await webpush.sendNotification(subscription, message, {
      TTL: 60 * 60, // 1 hour
      urgency: 'normal',
    });
    return true;
  } catch (error: any) {
    console.error('Push send error:', error);
    // Remove expired subscriptions
    if (error.statusCode === 410) {
      // Subscription expired - should be cleaned up
    }
    return false;
  }
}

// Broadcast to room members
export async function broadcastToRoom(
  roomId: string,
  excludeUserIds: string[],
  title: string,
  body: string
): Promise<{ userId: string; success: boolean }[]> {
  const subscriptions = global.pushSubscriptions || new Map();
  const results: { userId: string; success: boolean }[] = [];
  
  for (const [userId, sub] of subscriptions) {
    if (!excludeUserIds.includes(userId)) {
      const success = await sendPushNotification(
        sub,
        title,
        body,
        { url: `/room/${roomId}`, roomId }
      );
      results.push({ userId, success });
    }
  }
  
  return results;
}

// Export subscriptions map for use across routes
declare global {
  // eslint-disable-next-line no-var
  var pushSubscriptions: Map<string, {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId: string;
    createdAt: string;
  }> | undefined;
}

export default router;
