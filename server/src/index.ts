import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings } from './types';
import { authRoutes } from './routes/auth';
import { groupRoutes } from './routes/groups';
import { taskRoutes } from './routes/tasks';
import { pushRoutes } from './routes/push';
import { getDueSoonTasks, getPushSubscriptionsByUser, getPushSubscriptionsByGroup } from './db/queries';
import { sendPushToSubscriptions } from './push/vapid';

const app = new Hono<{ Bindings: Bindings }>();

// CORS configuration to allow local Vite dev server and deployed origins
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost dev servers or same-domain production requests
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.pages.dev') || origin.includes('.workers.dev')) {
        return origin || '*';
      }
      return origin;
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use('*', logger());

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Math.floor(Date.now() / 1000),
    service: 'Tick API',
  });
});

// Route Modules
app.route('/api/auth', authRoutes);
app.route('/api/groups', groupRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/push', pushRoutes);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Unhandled Worker error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// Cron Trigger Handler (FR-CRON-1, FR-CRON-2, FR-CRON-3)
export async function handleScheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
  console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

  try {
    // Scan tasks due in next 30 minutes (1800 seconds)
    const dueTasks = await getDueSoonTasks(env.DB, 1800);
    console.log(`Found ${dueTasks.length} tasks due soon`);

    for (const task of dueTasks) {
      let subs = [];
      let isForAnyone = false;

      if (task.assignee_id) {
        subs = await getPushSubscriptionsByUser(env.DB, task.assignee_id);
      } else {
        subs = await getPushSubscriptionsByGroup(env.DB, task.group_id);
        isForAnyone = true;
      }

      if (subs.length === 0) continue;

      const title = isForAnyone
        ? `${task.title} (Open to anyone) needs attention`
        : `${task.title} needs your attention`;

      await sendPushToSubscriptions(env, subs, {
        title,
        body: `Click to open the Tick App and complete the task`,
        url: `/?group=${task.group_id}&task=${task.id}`,
        tag: `due-reminder-${task.id}`,
      });
    }
  } catch (err) {
    console.error('Error during scheduled cron execution:', err);
  }
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
