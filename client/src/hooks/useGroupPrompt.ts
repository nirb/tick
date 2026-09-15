import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Group, GroupMembership } from '../types';
import {
  getCookie,
  setCookie,
  COOKIE_LAST_SELECTED_GROUP,
  COOKIE_AUTOMATICALLY_SHOW_GROUP,
  COOKIE_LAST_GROUP_PROMPT_TIME,
  COOKIE_LAST_ACTIVE_TIME,
  TWO_HOURS_MS,
  ONE_WEEK_MS,
} from '../lib/cookies';

interface UseGroupPromptOptions {
  user: User | null;
  group: Group | null;
  groups: GroupMembership[];
  loading: boolean;
  switchGroup: (groupId: string) => Promise<void>;
}

export function useGroupPrompt({
  user,
  group,
  groups,
  loading,
  switchGroup,
}: UseGroupPromptOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialSelectedGroupId, setInitialSelectedGroupId] = useState<string | null>(null);
  const [initialAutoEnter, setInitialAutoEnter] = useState(false);

  // Track if we have evaluated the prompt for the current active app session
  const hasEvaluatedSessionRef = useRef(false);
  const lastActiveThrottleRef = useRef(0);

  // Record user activity timestamp
  const recordActive = useCallback(() => {
    const now = Date.now();
    // Throttle cookie writes to once every 15 seconds
    if (now - lastActiveThrottleRef.current > 15000) {
      lastActiveThrottleRef.current = now;
      setCookie(COOKIE_LAST_ACTIVE_TIME, now.toString());
    }
  }, []);

  // Force record active time immediately (no throttle)
  const recordActiveImmediate = useCallback(() => {
    const now = Date.now();
    lastActiveThrottleRef.current = now;
    setCookie(COOKIE_LAST_ACTIVE_TIME, now.toString());
  }, []);

  // Evaluate whether to show the popup or auto-enter
  const evaluateGroupPrompt = useCallback(async () => {
    if (loading || !user) return;

    // If deep linking into a specific task or group (e.g. from notification), bypass prompt
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('group') || searchParams.get('task')) {
        recordActiveImmediate();
        return;
      }
    }

    // Requirement: "if user has only one group, don't show this popup"
    if (!groups || groups.length <= 1) {
      recordActiveImmediate();
      if (group?.id) {
        setCookie(COOKIE_LAST_SELECTED_GROUP, group.id);
      }
      return;
    }

    const lastActiveStr = getCookie(COOKIE_LAST_ACTIVE_TIME);
    const autoEnter = getCookie(COOKIE_AUTOMATICALLY_SHOW_GROUP) === 'true';
    const promptTimeStr = getCookie(COOKIE_LAST_GROUP_PROMPT_TIME);
    const lastGroupId = getCookie(COOKIE_LAST_SELECTED_GROUP);

    let isInactiveFor2Hours = false;

    if (!lastActiveStr) {
      // First time running with this feature or cookie cleared
      isInactiveFor2Hours = true;
    } else {
      const elapsed = Date.now() - Number(lastActiveStr);
      if (isNaN(elapsed) || elapsed >= TWO_HOURS_MS) {
        isInactiveFor2Hours = true;
      }
    }

    if (!isInactiveFor2Hours) {
      recordActive();
      return;
    }

    // Inactivity threshold (>= 2 hours) reached!
    const promptTime = promptTimeStr ? Number(promptTimeStr) : 0;
    const isWithinWeek = promptTime > 0 && Date.now() - promptTime < ONE_WEEK_MS;

    const targetGroupId =
      lastGroupId === 'ALL_GROUPS'
        ? 'ALL_GROUPS'
        : lastGroupId && groups.some((g) => g.group_id === lastGroupId)
        ? lastGroupId
        : group?.id || groups[0]?.group_id;

    // Requirement:
    // If auto-enter is checked AND less than a week has passed:
    // Automatically enter the last used group, do NOT show popup.
    if (autoEnter && isWithinWeek && targetGroupId) {
      if (targetGroupId === 'ALL_GROUPS') {
        try {
          await switchGroup('ALL_GROUPS');
        } catch (err) {
          console.warn('Failed auto-entering ALL_GROUPS:', err);
        }
      } else if (group?.id !== targetGroupId) {
        try {
          await switchGroup(targetGroupId);
        } catch (err) {
          console.warn('Failed auto-entering last selected group:', err);
        }
      }
      recordActiveImmediate();
      return;
    }

    // Otherwise:
    // Either autoEnter is false, or >= 1 week has passed ("after a week , show this popupagain , event if the user check the checkbox")
    setInitialSelectedGroupId(targetGroupId);
    setInitialAutoEnter(autoEnter);
    setIsModalOpen(true);
  }, [loading, user, groups, group, switchGroup, recordActive, recordActiveImmediate]);

  // Handle evaluation on mount / when auth finishes loading
  useEffect(() => {
    if (!loading && user && groups && groups.length > 0) {
      if (!hasEvaluatedSessionRef.current) {
        hasEvaluatedSessionRef.current = true;
        evaluateGroupPrompt();
      }
    }
  }, [loading, user, groups, evaluateGroupPrompt]);

  // Keep last active time updated during usage and detect returning after inactivity
  useEffect(() => {
    if (!user) return;

    // Periodic heartbeat to refresh active time every 60 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        recordActive();
      }
    }, 60000);

    // Track user interactions to maintain accurate last active time
    const handleUserInteraction = () => {
      recordActive();
    };

    // Visibility change handler (switching tabs / minimizing / lock screen)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordActiveImmediate();
        // Reset evaluation session ref so when user returns, we check if 2 hours elapsed
        hasEvaluatedSessionRef.current = false;
      } else if (document.visibilityState === 'visible') {
        if (!hasEvaluatedSessionRef.current) {
          hasEvaluatedSessionRef.current = true;
          evaluateGroupPrompt();
        }
      }
    };

    // Page hide / unload handlers
    const handlePageHide = () => {
      recordActiveImmediate();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [user, recordActive, recordActiveImmediate, evaluateGroupPrompt]);

  const handleSelectGroup = async (groupId: string, autoEnterValue: boolean) => {
    const now = Date.now().toString();
    setCookie(COOKIE_LAST_SELECTED_GROUP, groupId);
    setCookie(COOKIE_AUTOMATICALLY_SHOW_GROUP, autoEnterValue ? 'true' : 'false');
    setCookie(COOKIE_LAST_GROUP_PROMPT_TIME, now);
    setCookie(COOKIE_LAST_ACTIVE_TIME, now);

    await switchGroup(groupId);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    recordActiveImmediate();
    if (group?.id) {
      setCookie(COOKIE_LAST_SELECTED_GROUP, group.id);
    }
    setIsModalOpen(false);
  };

  return {
    isGroupSelectModalOpen: isModalOpen,
    initialSelectedGroupId,
    initialAutoEnter,
    handleSelectGroup,
    handleCloseModal,
  };
}
