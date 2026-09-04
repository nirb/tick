import { Hono } from 'hono';
import { Bindings, JWTPayload, TaskPriority, TaskStatus } from '../types';
import { authMiddleware } from '../auth';
import {
  getTasksByGroupId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getActivitiesByTaskId,
  addTaskActivity,
  getPushSubscriptionsByUser,
} from '../db/queries';
import { sendPushToSubscriptions } from '../push/vapid';

export const taskRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

taskRoutes.use('*', authMiddleware);

// GET /api/tasks - Lists group tasks (filters: status, assignee, priority)
taskRoutes.get('/', async (c) => {
  const jwtUser = c.get('user');
  const status = c.req.query('status');
  const assigneeId = c.req.query('assignee_id');
  const priority = c.req.query('priority');

  const tasks = await getTasksByGroupId(c.env.DB, jwtUser.groupId, {
    status,
    assignee_id: assigneeId,
    priority,
  });

  return c.json({ tasks });
});

// GET /api/tasks/:id - Get single task with activities
taskRoutes.get('/:id', async (c) => {
  const jwtUser = c.get('user');
  const taskId = c.req.param('id');

  const task = await getTaskById(c.env.DB, taskId);
  if (!task || task.group_id !== jwtUser.groupId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const activities = await getActivitiesByTaskId(c.env.DB, taskId);
  return c.json({ task, activities });
});

// POST /api/tasks - Creates task & triggers push to assignee (FR-TASK-1, FR-PUSH-2)
taskRoutes.post('/', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{
    title: string;
    description?: string;
    assignee_id?: string | null;
    priority?: TaskPriority;
    due_at?: number | null;
    recurrence_rule?: string | null;
  }>();

  if (!body.title || !body.title.trim()) {
    return c.json({ error: 'Title is required' }, 400);
  }

  const task = await createTask(
    c.env.DB,
    {
      groupId: jwtUser.groupId,
      creatorId: jwtUser.sub,
      assigneeId: body.assignee_id,
      title: body.title.trim(),
      description: body.description?.trim(),
      priority: body.priority,
      dueAt: body.due_at,
      recurrenceRule: body.recurrence_rule,
    },
    jwtUser.sub
  );

  // Dispatch Push Notification to Assignee if assigned to someone else
  if (body.assignee_id && body.assignee_id !== jwtUser.sub) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const subs = await getPushSubscriptionsByUser(c.env.DB, body.assignee_id!);
          if (subs.length > 0) {
            await sendPushToSubscriptions(c.env, subs, {
              title: 'New Task Assigned 📋',
              body: `${jwtUser.name} assigned you: "${task.title}"`,
              url: `/?task=${task.id}`,
              actions: [
                { action: 'open', title: 'View Task' },
                { action: 'complete', title: 'Mark Done' },
              ],
            });
          }
        } catch (err) {
          console.error('Failed to send task assignment push:', err);
        }
      })()
    );
  }

  return c.json({ task }, 201);
});

// PATCH /api/tasks/:id - Updates status/assignee & triggers push (FR-TASK-2, FR-TASK-3, FR-PUSH-2)
taskRoutes.patch('/:id', async (c) => {
  const jwtUser = c.get('user');
  const taskId = c.req.param('id');

  const existing = await getTaskById(c.env.DB, taskId);
  if (!existing || existing.group_id !== jwtUser.groupId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    description?: string | null;
    assignee_id?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_at?: number | null;
    recurrence_rule?: string | null;
  }>();

  const updated = await updateTask(c.env.DB, taskId, body, jwtUser.sub, existing);

  // FR-PUSH-2: Trigger push notifications based on changes
  c.executionCtx.waitUntil(
    (async () => {
      try {
        // 1. Task Completed: notify creator if completed by someone else
        if (body.status === 'completed' && existing.status !== 'completed') {
          if (existing.creator_id !== jwtUser.sub) {
            const creatorSubs = await getPushSubscriptionsByUser(c.env.DB, existing.creator_id);
            if (creatorSubs.length > 0) {
              await sendPushToSubscriptions(c.env, creatorSubs, {
                title: 'Task Completed! 🎉',
                body: `${jwtUser.name} completed: "${existing.title}"`,
                url: `/?task=${taskId}`,
              });
            }
          }
        }

        // 2. Reassigned to someone else
        if (body.assignee_id && body.assignee_id !== existing.assignee_id && body.assignee_id !== jwtUser.sub) {
          const newAssigneeSubs = await getPushSubscriptionsByUser(c.env.DB, body.assignee_id);
          if (newAssigneeSubs.length > 0) {
            await sendPushToSubscriptions(c.env, newAssigneeSubs, {
              title: 'Task Reassigned to You 📋',
              body: `${jwtUser.name} assigned: "${existing.title}" to you`,
              url: `/?task=${taskId}`,
            });
          }
        }
      } catch (err) {
        console.error('Failed to send push on task update:', err);
      }
    })()
  );

  return c.json({ task: updated });
});

// DELETE /api/tasks/:id - Deletes task
taskRoutes.delete('/:id', async (c) => {
  const jwtUser = c.get('user');
  const taskId = c.req.param('id');

  const existing = await getTaskById(c.env.DB, taskId);
  if (!existing || existing.group_id !== jwtUser.groupId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await deleteTask(c.env.DB, taskId);
  return c.json({ success: true });
});

// POST /api/tasks/:id/nudge - Sends immediate push reminder to assignee (FR-PUSH-2)
taskRoutes.post('/:id/nudge', async (c) => {
  const jwtUser = c.get('user');
  const taskId = c.req.param('id');

  const task = await getTaskById(c.env.DB, taskId);
  if (!task || task.group_id !== jwtUser.groupId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  if (!task.assignee_id) {
    return c.json({ error: 'Task has no assignee to nudge' }, 400);
  }

  if (task.assignee_id === jwtUser.sub) {
    return c.json({ error: 'You cannot nudge yourself' }, 400);
  }

  // Record activity
  await addTaskActivity(
    c.env.DB,
    taskId,
    jwtUser.sub,
    'commented',
    JSON.stringify({ action: 'nudged', actorName: jwtUser.name })
  );

  // Send push notification to assignee
  const assigneeSubs = await getPushSubscriptionsByUser(c.env.DB, task.assignee_id);
  let pushResult = { sent: 0, failed: 0, pruned: 0 };

  if (assigneeSubs.length > 0) {
    pushResult = await sendPushToSubscriptions(c.env, assigneeSubs, {
      title: 'Gentle Nudge! ⏰',
      body: `${jwtUser.name} sent you a reminder for: "${task.title}"`,
      url: `/?task=${taskId}`,
      actions: [
        { action: 'open', title: 'Open Task' },
        { action: 'complete', title: 'Mark Done' },
      ],
    });
  }

  return c.json({
    success: true,
    nudged_assignee_id: task.assignee_id,
    active_subscriptions: assigneeSubs.length,
    push_sent: pushResult.sent,
  });
});
