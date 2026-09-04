import { Hono } from 'hono';
import { Bindings, JWTPayload } from '../types';
import { authMiddleware } from '../auth';
import {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsByUser,
} from '../db/queries';
import { sendPushToSubscriptions } from '../push/vapid';

export const pushRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

// GET /api/push/vapid-public-key - Public endpoint to retrieve VAPID key
pushRoutes.get('/vapid-public-key', (c) => {
  return c.json({
    publicKey: c.env.VAPID_PUBLIC_KEY,
  });
});

// All subsequent push routes require auth
pushRoutes.use('*', authMiddleware);

// POST /api/push/subscribe (FR-PUSH-1, SRS 6.2)
pushRoutes.post('/subscribe', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'Invalid subscription payload: endpoint and keys required' }, 400);
  }

  const userAgent = c.req.header('User-Agent') || null;

  const subscriptionId = await savePushSubscription(
    c.env.DB,
    jwtUser.sub,
    body.endpoint,
    body.keys.p256dh,
    body.keys.auth,
    userAgent
  );

  return c.json(
    {
      success: true,
      subscription_id: subscriptionId,
    },
    201
  );
});

// DELETE /api/push/unsubscribe
pushRoutes.delete('/unsubscribe', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{ endpoint: string }>();

  if (!body.endpoint) {
    return c.json({ error: 'Endpoint is required' }, 400);
  }

  const removed = await deletePushSubscription(c.env.DB, jwtUser.sub, body.endpoint);
  return c.json({ success: true, removed });
});

// POST /api/push/test - Send test notification to verify push setup
pushRoutes.post('/test', async (c) => {
  const jwtUser = c.get('user');
  const subs = await getPushSubscriptionsByUser(c.env.DB, jwtUser.sub);

  if (subs.length === 0) {
    return c.json(
      {
        error: 'No push subscriptions found for this account. Please enable notifications on this device first.',
      },
      404
    );
  }

  const result = await sendPushToSubscriptions(c.env, subs, {
    title: '🔔 Tick Notification Test',
    body: `Hello ${jwtUser.name}! Push notifications are working perfectly on this device.`,
    url: '/',
  });

  return c.json({
    success: true,
    total_subscriptions: subs.length,
    sent: result.sent,
    failed: result.failed,
    pruned: result.pruned,
  });
});
