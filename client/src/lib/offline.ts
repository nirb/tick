import { get, set } from 'idb-keyval';
import type { TaskWithAssignee, User } from '../types';

const TASKS_KEY = 'tick_cached_tasks';
const MEMBERS_KEY = 'tick_cached_members';

export async function cacheTasks(tasks: TaskWithAssignee[]): Promise<void> {
  try {
    await set(TASKS_KEY, tasks);
  } catch (e) {
    console.warn('Failed to cache tasks in IndexedDB:', e);
  }
}

export async function getCachedTasks(): Promise<TaskWithAssignee[] | null> {
  try {
    const cached = await get<TaskWithAssignee[]>(TASKS_KEY);
    return cached || null;
  } catch (e) {
    console.warn('Failed to read cached tasks from IndexedDB:', e);
    return null;
  }
}

export async function cacheMembers(members: User[]): Promise<void> {
  try {
    await set(MEMBERS_KEY, members);
  } catch (e) {
    console.warn('Failed to cache members in IndexedDB:', e);
  }
}

export async function getCachedMembers(): Promise<User[] | null> {
  try {
    const cached = await get<User[]>(MEMBERS_KEY);
    return cached || null;
  } catch (e) {
    console.warn('Failed to read cached members from IndexedDB:', e);
    return null;
  }
}
