export interface Bindings {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  JWT_SECRET: string;
  APP_URL?: string;
  GOOGLE_CLIENT_ID?: string;
}

export type UserRole = 'admin' | 'member';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ActivityType = 'created' | 'assigned' | 'status_changed' | 'commented';

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: number;
}

export interface GroupMembership {
  group_id: string;
  name: string;
  invite_code: string;
  role: UserRole;
  joined_at: number;
}

export interface User {
  id: string;
  group_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: number;
  password_hash?: string | null;
  auth_provider?: 'email' | 'google';
}

export interface Task {
  id: string;
  group_id: string;
  creator_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: number | null;
  completed_at: number | null;
  recurrence_rule: string | null;
  created_at: number;
  updated_at: number;
}

export interface TaskWithAssignee extends Task {
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  creator_name?: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: number;
  last_used_at: number;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string;
  actor_name?: string;
  activity_type: ActivityType;
  details: string | null;
  created_at: number;
}

export interface JWTPayload {
  sub: string;
  groupId: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  actions?: Array<{ action: string; title: string }>;
  tag?: string;
  data?: Record<string, unknown>;
}
