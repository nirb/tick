import type { Group, Task, TaskActivity, TaskPriority, TaskStatus, TaskWithAssignee, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('tick_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('tick_token', token);
  } else {
    localStorage.removeItem('tick_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ success: boolean; token: string; user: User; group: Group }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (name: string, email: string, password: string, groupName?: string, inviteCode?: string) =>
      request<{ success: boolean; token: string; user: User; group: Group }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, groupName, inviteCode }),
      }),

    google: (data: { credential?: string; email?: string; name?: string; avatarUrl?: string; inviteCode?: string }) =>
      request<{ success: boolean; token: string; user: User; group: Group }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMe: () => request<{ user: User; group: Group }>('/api/auth/me'),

    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
      }),
  },

  groups: {
    getMe: () => request<{ group: Group; members: User[] }>('/api/groups/me'),

    regenerateInvite: () =>
      request<{ success: boolean; invite_code: string }>('/api/groups/regenerate-invite', {
        method: 'POST',
      }),

    updateName: (name: string) =>
      request<{ success: boolean; group: Group }>('/api/groups/me', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),

    join: (inviteCode: string) =>
      request<{ success: boolean; group: Group; members: User[] }>('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),
  },

  tasks: {
    list: (filters: { status?: string; assignee_id?: string; priority?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.assignee_id) params.set('assignee_id', filters.assignee_id);
      if (filters.priority) params.set('priority', filters.priority);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ tasks: TaskWithAssignee[] }>(`/api/tasks${query}`);
    },

    get: (id: string) => request<{ task: TaskWithAssignee; activities: TaskActivity[] }>(`/api/tasks/${id}`),

    create: (data: {
      title: string;
      description?: string;
      assignee_id?: string | null;
      priority?: TaskPriority;
      due_at?: number | null;
      recurrence_rule?: string | null;
    }) =>
      request<{ task: Task }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: {
        title?: string;
        description?: string | null;
        assignee_id?: string | null;
        status?: TaskStatus;
        priority?: TaskPriority;
        due_at?: number | null;
        recurrence_rule?: string | null;
      }
    ) =>
      request<{ task: TaskWithAssignee }>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/tasks/${id}`, {
        method: 'DELETE',
      }),

    nudge: (id: string) =>
      request<{ success: boolean; nudged_assignee_id: string; active_subscriptions: number; push_sent: number }>(
        `/api/tasks/${id}/nudge`,
        {
          method: 'POST',
        }
      ),
  },

  push: {
    getPublicKey: () => request<{ publicKey: string }>('/api/push/vapid-public-key'),

    subscribe: (subscription: PushSubscriptionJSON) =>
      request<{ success: boolean; subscription_id: string }>('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
      }),

    unsubscribe: (endpoint: string) =>
      request<{ success: boolean; removed: boolean }>('/api/push/unsubscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint }),
      }),

    test: () =>
      request<{ success: boolean; total_subscriptions: number; sent: number; failed: number; pruned: number }>(
        '/api/push/test',
        {
          method: 'POST',
        }
      ),
  },
};
