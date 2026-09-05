import { get, set } from 'idb-keyval';
import type { TaskWithAssignee, User } from '../types';

const TASKS_KEY = 'tick_cached_tasks';
const MEMBERS_KEY = 'tick_cached_members';

export async function cacheTasks(tasks: TaskWithAssignee[], groupId?: string): Promise<void> {
  try {
    const key = groupId ? `${TASKS_KEY}_${groupId}` : TASKS_KEY;
    await set(key, tasks);
  } catch (e) {
    console.warn('Failed to cache tasks in IndexedDB:', e);
  }
}

export async function getCachedTasks(groupId?: string): Promise<TaskWithAssignee[] | null> {
  try {
    const key = groupId ? `${TASKS_KEY}_${groupId}` : TASKS_KEY;
    const cached = await get<TaskWithAssignee[]>(key);
    if (cached) return cached;
    if (groupId) {
      const fallback = await get<TaskWithAssignee[]>(TASKS_KEY);
      return fallback || null;
    }
    return null;
  } catch (e) {
    console.warn('Failed to read cached tasks from IndexedDB:', e);
    return null;
  }
}

export async function cacheMembers(members: User[], groupId?: string): Promise<void> {
  try {
    const key = groupId ? `${MEMBERS_KEY}_${groupId}` : MEMBERS_KEY;
    await set(key, members);
  } catch (e) {
    console.warn('Failed to cache members in IndexedDB:', e);
  }
}

export async function getCachedMembers(groupId?: string): Promise<User[] | null> {
  try {
    const key = groupId ? `${MEMBERS_KEY}_${groupId}` : MEMBERS_KEY;
    const cached = await get<User[]>(key);
    if (cached) return cached;
    if (groupId) {
      const fallback = await get<User[]>(MEMBERS_KEY);
      return fallback || null;
    }
    return null;
  } catch (e) {
    console.warn('Failed to read cached members from IndexedDB:', e);
    return null;
  }
}
