import {
  Group,
  User,
  Task,
  TaskWithAssignee,
  PushSubscriptionRow,
  TaskActivity,
  UserRole,
  TaskStatus,
  TaskPriority,
  ActivityType,
} from '../types';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// ---------------- Groups ----------------

export async function createGroup(db: D1Database, name: string, inviteCode?: string): Promise<Group> {
  const id = crypto.randomUUID();
  const code = inviteCode || generateInviteCode();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare('INSERT INTO groups (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, code, now)
    .run();

  return { id, name, invite_code: code, created_at: now };
}

export async function getGroupById(db: D1Database, id: string): Promise<Group | null> {
  const result = await db
    .prepare('SELECT id, name, invite_code, created_at FROM groups WHERE id = ?')
    .bind(id)
    .first<Group>();
  return result || null;
}

export async function getGroupByInviteCode(db: D1Database, code: string): Promise<Group | null> {
  const result = await db
    .prepare('SELECT id, name, invite_code, created_at FROM groups WHERE invite_code = ?')
    .bind(code.trim().toUpperCase())
    .first<Group>();
  return result || null;
}

export async function regenerateInviteCode(db: D1Database, groupId: string): Promise<string> {
  const newCode = generateInviteCode();
  await db
    .prepare('UPDATE groups SET invite_code = ? WHERE id = ?')
    .bind(newCode, groupId)
    .run();
  return newCode;
}

export async function getGroupMembers(db: D1Database, groupId: string): Promise<User[]> {
  const { results } = await db
    .prepare(
      'SELECT id, group_id, name, email, role, avatar_url, created_at FROM users WHERE group_id = ? ORDER BY role ASC, name ASC'
    )
    .bind(groupId)
    .all<User>();
  return results;
}

// ---------------- Users ----------------

export async function createUser(
  db: D1Database,
  data: {
    groupId: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
  }
): Promise<User> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const avatarUrl = data.avatarUrl || null;

  await db
    .prepare(
      'INSERT INTO users (id, group_id, name, email, role, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, data.groupId, data.name, data.email.toLowerCase().trim(), data.role, avatarUrl, now)
    .run();

  return {
    id,
    group_id: data.groupId,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    role: data.role,
    avatar_url: avatarUrl,
    created_at: now,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT id, group_id, name, email, role, avatar_url, created_at FROM users WHERE id = ?')
    .bind(id)
    .first<User>();
  return result || null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT id, group_id, name, email, role, avatar_url, created_at FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first<User>();
  return result || null;
}

// ---------------- Tasks ----------------

export async function getTasksByGroupId(
  db: D1Database,
  groupId: string,
  filters: { status?: string; assignee_id?: string; priority?: string } = {}
): Promise<TaskWithAssignee[]> {
  let query = `
    SELECT 
      t.id, t.group_id, t.creator_id, t.assignee_id, t.title, t.description,
      t.status, t.priority, t.due_at, t.completed_at, t.recurrence_rule,
      t.created_at, t.updated_at,
      u.name as assignee_name, u.avatar_url as assignee_avatar,
      c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.group_id = ?
  `;

  const params: (string | number)[] = [groupId];

  if (filters.status) {
    query += ' AND t.status = ?';
    params.push(filters.status);
  }

  if (filters.assignee_id) {
    query += ' AND t.assignee_id = ?';
    params.push(filters.assignee_id);
  }

  if (filters.priority) {
    query += ' AND t.priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY CASE t.status WHEN "pending" THEN 1 WHEN "in_progress" THEN 2 WHEN "completed" THEN 3 ELSE 4 END, t.due_at ASC, t.created_at DESC';

  const stmt = db.prepare(query).bind(...params);
  const { results } = await stmt.all<TaskWithAssignee>();
  return results;
}

export async function getTaskById(db: D1Database, id: string): Promise<TaskWithAssignee | null> {
  const result = await db
    .prepare(`
      SELECT 
        t.id, t.group_id, t.creator_id, t.assignee_id, t.title, t.description,
        t.status, t.priority, t.due_at, t.completed_at, t.recurrence_rule,
        t.created_at, t.updated_at,
        u.name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.creator_id = c.id
      WHERE t.id = ?
    `)
    .bind(id)
    .first<TaskWithAssignee>();

  return result || null;
}

export async function createTask(
  db: D1Database,
  data: {
    groupId: string;
    creatorId: string;
    assigneeId?: string | null;
    title: string;
    description?: string | null;
    priority?: TaskPriority;
    dueAt?: number | null;
    recurrenceRule?: string | null;
  },
  actorId: string
): Promise<Task> {
  const taskId = crypto.randomUUID();
  const activityId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const priority = data.priority || 'medium';
  const assigneeId = data.assigneeId || null;
  const description = data.description || null;
  const dueAt = data.dueAt || null;
  const recurrenceRule = data.recurrenceRule || null;

  // Batch insert: Task + Initial Activity
  await db.batch([
    db
      .prepare(`
        INSERT INTO tasks (
          id, group_id, creator_id, assignee_id, title, description,
          status, priority, due_at, recurrence_rule, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `)
      .bind(
        taskId,
        data.groupId,
        data.creatorId,
        assigneeId,
        data.title,
        description,
        priority,
        dueAt,
        recurrenceRule,
        now,
        now
      ),
    db
      .prepare(`
        INSERT INTO task_activities (id, task_id, actor_id, activity_type, details, created_at)
        VALUES (?, ?, ?, 'created', ?, ?)
      `)
      .bind(activityId, taskId, actorId, JSON.stringify({ title: data.title, assignee_id: assigneeId }), now),
  ]);

  return {
    id: taskId,
    group_id: data.groupId,
    creator_id: data.creatorId,
    assignee_id: assigneeId,
    title: data.title,
    description,
    status: 'pending',
    priority,
    due_at: dueAt,
    completed_at: null,
    recurrence_rule: recurrenceRule,
    created_at: now,
    updated_at: now,
  };
}

export async function updateTask(
  db: D1Database,
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    assignee_id?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_at?: number | null;
    recurrence_rule?: string | null;
  },
  actorId: string,
  existingTask: TaskWithAssignee
): Promise<TaskWithAssignee> {
  const now = Math.floor(Date.now() / 1000);
  const completedAt =
    updates.status === 'completed' && existingTask.status !== 'completed'
      ? now
      : updates.status && updates.status !== 'completed'
      ? null
      : existingTask.completed_at;

  const setClauses: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [now];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description);
  }
  if (updates.assignee_id !== undefined) {
    setClauses.push('assignee_id = ?');
    params.push(updates.assignee_id);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(updates.status);
    setClauses.push('completed_at = ?');
    params.push(completedAt);
  }
  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(updates.priority);
  }
  if (updates.due_at !== undefined) {
    setClauses.push('due_at = ?');
    params.push(updates.due_at);
  }
  if (updates.recurrence_rule !== undefined) {
    setClauses.push('recurrence_rule = ?');
    params.push(updates.recurrence_rule);
  }

  params.push(taskId);

  const batchOps: D1PreparedStatement[] = [
    db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params),
  ];

  // Log activities
  if (updates.status && updates.status !== existingTask.status) {
    batchOps.push(
      db
        .prepare(`
          INSERT INTO task_activities (id, task_id, actor_id, activity_type, details, created_at)
          VALUES (?, ?, ?, 'status_changed', ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          taskId,
          actorId,
          JSON.stringify({ from: existingTask.status, to: updates.status }),
          now
        )
    );
  }

  if (updates.assignee_id !== undefined && updates.assignee_id !== existingTask.assignee_id) {
    batchOps.push(
      db
        .prepare(`
          INSERT INTO task_activities (id, task_id, actor_id, activity_type, details, created_at)
          VALUES (?, ?, ?, 'assigned', ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          taskId,
          actorId,
          JSON.stringify({ from: existingTask.assignee_id, to: updates.assignee_id }),
          now
        )
    );
  }

  // Handle Recurrence (FR-TASK-4): If completed and recurrence_rule defined, schedule next iteration instance
  if (updates.status === 'completed' && existingTask.status !== 'completed' && existingTask.recurrence_rule) {
    const nextDueAt = calculateNextRecurrence(existingTask.due_at || now, existingTask.recurrence_rule);
    if (nextDueAt) {
      const nextTaskId = crypto.randomUUID();
      batchOps.push(
        db
          .prepare(`
            INSERT INTO tasks (
              id, group_id, creator_id, assignee_id, title, description,
              status, priority, due_at, recurrence_rule, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
          `)
          .bind(
            nextTaskId,
            existingTask.group_id,
            existingTask.creator_id,
            existingTask.assignee_id,
            existingTask.title,
            existingTask.description,
            existingTask.priority,
            nextDueAt,
            existingTask.recurrence_rule,
            now,
            now
          ),
        db
          .prepare(`
            INSERT INTO task_activities (id, task_id, actor_id, activity_type, details, created_at)
            VALUES (?, ?, ?, 'created', ?, ?)
          `)
          .bind(
            crypto.randomUUID(),
            nextTaskId,
            actorId,
            JSON.stringify({ note: 'Scheduled recurring task instance', originalTaskId: taskId }),
            now
          )
      );
    }
  }

  await db.batch(batchOps);

  const updated = await getTaskById(db, taskId);
  return updated!;
}

export function calculateNextRecurrence(baseTimestamp: number, rule: string): number | null {
  const upper = rule.toUpperCase();
  const daySeconds = 86400;

  if (upper.includes('FREQ=DAILY')) {
    return baseTimestamp + daySeconds;
  }
  if (upper.includes('FREQ=WEEKLY')) {
    return baseTimestamp + daySeconds * 7;
  }
  if (upper.includes('FREQ=MONTHLY')) {
    return baseTimestamp + daySeconds * 30;
  }
  return baseTimestamp + daySeconds;
}

export async function deleteTask(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function getDueSoonTasks(db: D1Database, windowSeconds: number = 1800): Promise<Task[]> {
  const now = Math.floor(Date.now() / 1000);
  const future = now + windowSeconds;

  const { results } = await db
    .prepare(`
      SELECT * FROM tasks
      WHERE status NOT IN ('completed', 'cancelled')
        AND due_at IS NOT NULL
        AND due_at BETWEEN ? AND ?
    `)
    .bind(now, future)
    .all<Task>();

  return results;
}

// ---------------- Push Subscriptions ----------------

export async function savePushSubscription(
  db: D1Database,
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string | null
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_used_at = excluded.last_used_at
    `)
    .bind(id, userId, endpoint, p256dh, auth, userAgent || null, now, now)
    .run();

  return id;
}

export async function deletePushSubscription(db: D1Database, userId: string, endpoint: string): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .bind(userId, endpoint)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function getPushSubscriptionsByUser(db: D1Database, userId: string): Promise<PushSubscriptionRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
    .bind(userId)
    .all<PushSubscriptionRow>();
  return results;
}

export async function getPushSubscriptionsByUsers(db: D1Database, userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(`SELECT * FROM push_subscriptions WHERE user_id IN (${placeholders})`)
    .bind(...userIds)
    .all<PushSubscriptionRow>();
  return results;
}

// ---------------- Task Activities ----------------

export async function getActivitiesByTaskId(db: D1Database, taskId: string): Promise<TaskActivity[]> {
  const { results } = await db
    .prepare(`
      SELECT a.id, a.task_id, a.actor_id, a.activity_type, a.details, a.created_at, u.name as actor_name
      FROM task_activities a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at ASC
    `)
    .bind(taskId)
    .all<TaskActivity>();
  return results;
}

export async function addTaskActivity(
  db: D1Database,
  taskId: string,
  actorId: string,
  activityType: ActivityType,
  details: string | null
): Promise<TaskActivity> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(`
      INSERT INTO task_activities (id, task_id, actor_id, activity_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(id, taskId, actorId, activityType, details, now)
    .run();

  return {
    id,
    task_id: taskId,
    actor_id: actorId,
    activity_type: activityType,
    details,
    created_at: now,
  };
}
