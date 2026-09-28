import { Hono } from 'hono';
import { Bindings, JWTPayload, TaskPriority, TaskStatus } from '../types';
import { authMiddleware, extractToken } from '../auth';
import {
  getTasksByGroupId,
  getTasksForUserAllGroups,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getGroupMembers,
  getPushSubscriptionsByUser,
  getPushSubscriptionsByGroup,
  getUserGroupMembership,
} from '../db/queries';
import { sendPushToSubscriptions } from '../push/vapid';

export const mcpRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

// Tool Definitions for MCP
const MCP_TOOLS = [
  {
    name: 'list_tasks',
    description: 'List chores and tasks in Tick for the active family or group with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Filter tasks by status. Defaults to showing open tasks if omitted.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filter tasks by priority level.',
        },
        assignee_id: {
          type: 'string',
          description: 'Filter tasks by assigned family member user ID.',
        },
        all_groups: {
          type: 'boolean',
          description: 'Set to true to retrieve tasks across all family groups.',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new chore or family task in Tick. Automatically sends a Web Push notification to the assigned member.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short title describing the task (e.g., "Clean kitchen counter").',
        },
        description: {
          type: 'string',
          description: 'Optional additional instructions, notes, or checklist details.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level (default: "medium").',
        },
        assignee_id: {
          type: 'string',
          description: 'User ID of the assigned family member (omit or null for open to anyone).',
        },
        due_at: {
          type: 'integer',
          description: 'Unix timestamp in seconds when the task is due.',
        },
        recurrence_rule: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Recurrence rule for repeating tasks.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a chore as completed in Tick. If the chore is recurring, the next occurrence is automatically created.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to mark as completed.',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update fields of an existing task (e.g. reschedule, change priority, reassign, edit notes).',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to update.',
        },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        assignee_id: { type: 'string' },
        due_at: { type: 'integer' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a chore or task from Tick.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to delete.',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_family_members',
    description: 'List all family or team members in the user active group with their names, roles, and user IDs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'nudge_assignee',
    description: 'Send an instant Web Push notification reminder to the assigned family member for a task.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to send a reminder for.',
        },
      },
      required: ['task_id'],
    },
  },
];

// Tool Execution Dispatcher
async function executeTool(name: string, args: Record<string, any>, c: any): Promise<string> {
  const jwtUser: JWTPayload = c.get('user');

  switch (name) {
    case 'list_tasks': {
      let tasks = [];
      if (args.all_groups) {
        tasks = await getTasksForUserAllGroups(c.env.DB, jwtUser.sub, {
          status: args.status,
          priority: args.priority,
          assignee_id: args.assignee_id,
        });
      } else {
        tasks = await getTasksByGroupId(c.env.DB, jwtUser.groupId, {
          status: args.status,
          priority: args.priority,
          assignee_id: args.assignee_id,
        });
      }
      return JSON.stringify(tasks, null, 2);
    }

    case 'create_task': {
      if (!args.title || !args.title.trim()) {
        throw new Error('Title is required to create a task');
      }

      const task = await createTask(
        c.env.DB,
        {
          groupId: jwtUser.groupId,
          creatorId: jwtUser.sub,
          assigneeId: args.assignee_id || null,
          title: args.title.trim(),
          description: args.description?.trim() || null,
          priority: (args.priority as TaskPriority) || 'medium',
          dueAt: args.due_at || null,
          recurrenceRule: args.recurrence_rule || null,
        },
        jwtUser.sub
      );

      // Trigger Push Notification
      if (args.assignee_id && args.assignee_id !== jwtUser.sub) {
        const sendPush = async () => {
          try {
            const subs = await getPushSubscriptionsByUser(c.env.DB, args.assignee_id);
            if (subs.length > 0) {
              await sendPushToSubscriptions(c.env, subs, {
                title: 'New Task Assigned 📋',
                body: `${jwtUser.name} assigned you: "${task.title}"`,
                url: `/?group=${task.group_id}&task=${task.id}`,
              });
            }
          } catch (e) {
            console.error('Push error:', e);
          }
        };
        if (c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil(sendPush());
        } else {
          await sendPush();
        }
      }

      return JSON.stringify({ success: true, message: `Created task "${task.title}"`, task }, null, 2);
    }

    case 'complete_task': {
      const taskId = args.task_id;
      if (!taskId) throw new Error('task_id is required');

      const existing = await getTaskById(c.env.DB, taskId);
      if (!existing) throw new Error(`Task with ID ${taskId} not found`);

      const updated = await updateTask(c.env.DB, taskId, { status: 'completed' }, jwtUser.sub, existing);
      return JSON.stringify({ success: true, message: `Task "${existing.title}" marked as completed!`, task: updated }, null, 2);
    }

    case 'update_task': {
      const taskId = args.task_id;
      if (!taskId) throw new Error('task_id is required');

      const existing = await getTaskById(c.env.DB, taskId);
      if (!existing) throw new Error(`Task with ID ${taskId} not found`);

      const patch: any = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.description !== undefined) patch.description = args.description;
      if (args.priority !== undefined) patch.priority = args.priority;
      if (args.assignee_id !== undefined) patch.assignee_id = args.assignee_id;
      if (args.due_at !== undefined) patch.due_at = args.due_at;
      if (args.status !== undefined) patch.status = args.status;

      const updated = await updateTask(c.env.DB, taskId, patch, jwtUser.sub, existing);
      return JSON.stringify({ success: true, message: `Task "${updated.title}" updated`, task: updated }, null, 2);
    }

    case 'delete_task': {
      const taskId = args.task_id;
      if (!taskId) throw new Error('task_id is required');

      const existing = await getTaskById(c.env.DB, taskId);
      if (!existing) throw new Error(`Task with ID ${taskId} not found`);

      await deleteTask(c.env.DB, taskId);
      return JSON.stringify({ success: true, message: `Task "${existing.title}" deleted.` }, null, 2);
    }

    case 'get_family_members': {
      const members = await getGroupMembers(c.env.DB, jwtUser.groupId);
      return JSON.stringify(members, null, 2);
    }

    case 'nudge_assignee': {
      const taskId = args.task_id;
      if (!taskId) throw new Error('task_id is required');

      const task = await getTaskById(c.env.DB, taskId);
      if (!task) throw new Error('Task not found');
      if (!task.assignee_id) throw new Error('Task has no specific assignee to nudge');

      const subs = await getPushSubscriptionsByUser(c.env.DB, task.assignee_id);
      if (subs.length === 0) {
        return JSON.stringify({ success: false, message: 'Assignee has no active push notification subscriptions.' });
      }

      await sendPushToSubscriptions(c.env, subs, {
        title: 'Task Reminder 🔔',
        body: `${jwtUser.name} nudged you regarding: "${task.title}"`,
        url: `/?group=${task.group_id}&task=${task.id}`,
      });

      return JSON.stringify({ success: true, message: `Nudge reminder sent for "${task.title}".` });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC Message Handler
async function handleJsonRpc(
  body: any,
  c: any
): Promise<{ jsonrpc: '2.0'; id?: any; result?: any; error?: any } | null> {
  const { id, method, params } = body || {};

  // Notifications (no response needed)
  if (method === 'notifications/initialized' || (typeof method === 'string' && method.startsWith('notifications/'))) {
    return null;
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'tick-mcp-server',
          version: '1.0.0',
        },
      },
    };
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    try {
      const resultText = await executeTool(name, args || {}, c);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: resultText }],
          isError: false,
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Error: ${err.message || String(err)}` }],
          isError: true,
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

// 1. Standard MCP SSE Endpoint
mcpRoutes.get('/sse', authMiddleware, async (c) => {
  const sessionId = crypto.randomUUID();
  const origin = new URL(c.req.url).origin;
  const token = extractToken(c);
  const endpointUrl = `${origin}/api/mcp/messages?sessionId=${sessionId}${token ? `&apiKey=${encodeURIComponent(token)}` : ''}`;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial endpoint event
  await writer.write(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

  // Keep alive
  if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 15000));
            await writer.write(encoder.encode(': keepalive\n\n'));
          }
        } catch {
          // Closed by client
        } finally {
          try {
            await writer.close();
          } catch {}
        }
      })()
    );
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
});

// Also alias GET / to SSE for clients connecting directly to /api/mcp
mcpRoutes.get('/', authMiddleware, async (c) => {
  return c.redirect('/api/mcp/sse');
});

// 2. MCP JSON-RPC POST Endpoints
mcpRoutes.post('/', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const response = await handleJsonRpc(body, c);
  if (!response) {
    return c.body(null, 204);
  }
  return c.json(response);
});

mcpRoutes.post('/messages', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const response = await handleJsonRpc(body, c);
  if (!response) {
    return c.body(null, 204);
  }
  return c.json(response);
});
