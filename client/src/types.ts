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
  group_name?: string | null;
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

export type ChecklistItemStatus = 'done' | 'not done';

export interface ChecklistItem {
  id: string;
  status: ChecklistItemStatus;
  description: string;
}

export interface TextTaskContent {
  type: 'description';
  description: string;
}

export interface ChecklistTaskContent {
  type: 'checklist';
  checklist: ChecklistItem[];
}

export type TaskContent = TextTaskContent | ChecklistTaskContent;

