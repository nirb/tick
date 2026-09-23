/**
 * Cookie utilities for managing group selection preferences and user activity tracking.
 */

export const COOKIE_LAST_SELECTED_GROUP = 'last_selected_group';
export const COOKIE_AUTOMATICALLY_SHOW_GROUP = 'automaticaly_show_group';
export const COOKIE_LAST_GROUP_PROMPT_TIME = 'last_group_prompt_time';
export const COOKIE_LAST_ACTIVE_TIME = 'tick_last_active_time';
export const COOKIE_VIEW_TYPE = 'tick_view_type';

export type ViewType = 'list' | 'calendar';

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}
