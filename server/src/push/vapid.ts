import { buildPushHTTPRequest } from '@pushforge/builder';
import { Bindings, PushNotificationPayload, PushSubscriptionRow } from '../types';

interface JWKKey {
  kty: string;
  crv: string;
  x: string;
  y: string;
  d: string;
}

function parsePrivateKey(key: string): JWKKey {
  try {
    return JSON.parse(key);
  } catch {
    throw new Error('Invalid VAPID_PRIVATE_KEY: Must be a valid JWK JSON string');
  }
}

export async function sendPushToSubscriptions(
  env: Bindings,
  subscriptions: PushSubscriptionRow[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const privateJWK = parsePrivateKey(env.VAPID_PRIVATE_KEY);
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  const pushPayload: Record<string, any> = {
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    actions: payload.actions || [
      { action: 'open', title: 'View Task' },
      { action: 'complete', title: 'Mark Done' },
    ],
    tag: payload.tag || '',
    data: payload.data || {},
  };

  const promises = subscriptions.map(async (sub) => {
    try {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK,
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        message: {
          payload: pushPayload,
          adminContact: env.VAPID_SUBJECT,
        },
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (response.status === 201 || response.status === 200 || response.status === 202) {
        sent++;
        // Update last_used_at
        await env.DB.prepare(
          'UPDATE push_subscriptions SET last_used_at = unixepoch() WHERE id = ?'
        )
          .bind(sub.id)
          .run();
      } else {
        failed++;
        console.warn(`Push delivery status ${response.status} from ${endpoint}`);

        // FR-PUSH-3 & webpush-notifier skill:
        // Remote push gateway returns 404 Not Found or 410 Gone -> automatically DELETE subscription row from D1
        if (response.status === 404 || response.status === 410) {
          await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
            .bind(sub.endpoint)
            .run();
          pruned++;
          console.log(`Pruned expired push subscription (${response.status}): ${sub.endpoint}`);
        }
      }
    } catch (err: any) {
      failed++;
      console.error(`Error sending push notification to ${sub.endpoint}:`, err.message || err);
    }
  });

  await Promise.allSettled(promises);
  return { sent, failed, pruned };
}
