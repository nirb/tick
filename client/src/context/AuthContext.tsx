import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Group, GroupMembership, User } from '../types';
import { api, setToken } from '../lib/api';
import { cacheMembers, getCachedMembers } from '../lib/offline';
import { setCookie, getCookie, COOKIE_LAST_SELECTED_GROUP, COOKIE_LAST_ACTIVE_TIME } from '../lib/cookies';
import { getCurrentPushSubscription } from '../lib/push';

interface AuthContextType {
  user: User | null;
  group: Group | null;
  groups: GroupMembership[];
  members: User[];
  loading: boolean;
  isAllGroups: boolean;
  selectedGroupId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, groupName?: string, inviteCode?: string) => Promise<void>;
  loginWithGoogle: (data: { credential: string; inviteCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshGroup: () => Promise<void>;
  switchGroup: (groupId: string) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroupName: (name: string) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    return getCookie(COOKIE_LAST_SELECTED_GROUP) || null;
  });
  const [loading, setLoading] = useState(true);

  const isAllGroups = selectedGroupId === 'ALL_GROUPS' && groups.length > 1;

  const fetchProfileAndGroup = async () => {
    try {
      let targetGroupIdFromUrl: string | null = null;
      let targetTaskIdFromUrl: string | null = null;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        targetGroupIdFromUrl = searchParams.get('group');
        targetTaskIdFromUrl = searchParams.get('task');
      }

      const { user: currentUser, group: currentGroup, groups: userGroups } = await api.auth.getMe();
      setUser(currentUser);
      if (userGroups) setGroups(userGroups);

      const lastStoredGroup = getCookie(COOKIE_LAST_SELECTED_GROUP);
      const prevScope = lastStoredGroup || currentGroup?.id;

      // If deep linking into a notification task, preserve the user's previously selected group
      if (targetTaskIdFromUrl && prevScope && typeof window !== 'undefined') {
        sessionStorage.setItem('tick_notification_prev_group', prevScope);
      }

      let activeGroup = currentGroup;
      if (targetGroupIdFromUrl && userGroups?.some((g) => g.group_id === targetGroupIdFromUrl)) {
        if (currentGroup?.id !== targetGroupIdFromUrl) {
          try {
            const switchRes = await api.groups.switch(targetGroupIdFromUrl);
            if (switchRes.token) setToken(switchRes.token);
            activeGroup = switchRes.group;
            if (switchRes.groups) setGroups(switchRes.groups);
          } catch (e) {
            console.warn('Failed switching to target URL group on initial load:', e);
          }
        }
      }

      setGroup(activeGroup);

      if (lastStoredGroup === 'ALL_GROUPS' && userGroups && userGroups.length > 1 && !targetGroupIdFromUrl) {
        setSelectedGroupId('ALL_GROUPS');
        try {
          const allMembersRes = await api.groups.getAllMembers();
          if (allMembersRes.members && allMembersRes.members.length > 0) {
            setMembers(allMembersRes.members);
            await cacheMembers(allMembersRes.members, 'ALL_GROUPS');
          } else {
            const groupData = await api.groups.getMe();
            setMembers(groupData.members);
          }
        } catch {
          const groupData = await api.groups.getMe();
          setMembers(groupData.members);
        }
      } else {
        if (activeGroup?.id) {
          setSelectedGroupId(activeGroup.id);
          if (!targetTaskIdFromUrl) {
            setCookie(COOKIE_LAST_SELECTED_GROUP, activeGroup.id);
          }
        }
        const groupData = await api.groups.getMe();
        setMembers(groupData.members);
        if (groupData.groups) setGroups(groupData.groups);
        await cacheMembers(groupData.members, activeGroup?.id);
      }
    } catch {
      const cached = await getCachedMembers();
      if (cached) setMembers(cached);
      setUser(null);
      setGroup(null);
      setGroups([]);
      setSelectedGroupId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndGroup();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setToken(res.token);
    setUser(res.user);
    setGroup(res.group);
    if (res.groups) setGroups(res.groups);
    setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
    if (res.group?.id) setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
    try {
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } catch (err) {
      console.warn('Could not fetch members on login:', err);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, groupName?: string, inviteCode?: string) => {
    const res = await api.auth.register(name, email, password, groupName, inviteCode);
    setToken(res.token);
    setUser(res.user);
    setGroup(res.group);
    if (res.groups) setGroups(res.groups);
    setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
    if (res.group?.id) setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
    try {
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } catch (err) {
      console.warn('Could not fetch members on register:', err);
    }
  }, []);

  const loginWithGoogle = useCallback(async (data: { credential: string; inviteCode?: string }) => {
    const res = await api.auth.google(data);
    setToken(res.token);
    setUser(res.user);
    setGroup(res.group);
    if (res.groups) setGroups(res.groups);
    setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
    if (res.group?.id) setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
    try {
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } catch (err) {
      console.warn('Could not fetch members on google login:', err);
    }
  }, []);

  const logout = async () => {
    try {
      const sub = await getCurrentPushSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint).catch(() => {});
      }
    } catch {
      // ignore
    }
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn('Logout error', e);
    }
    setToken(null);
    setUser(null);
    setGroup(null);
    setGroups([]);
    setMembers([]);
    setSelectedGroupId(null);
  };

  const refreshGroup = async () => {
    if (!user) return;
    try {
      const groupData = await api.groups.getMe();
      setGroup(groupData.group);
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } catch (e) {
      console.warn('Failed to refresh group:', e);
    }
  };

  const switchGroup = async (groupId: string) => {
    const isNotificationActive =
      typeof window !== 'undefined' && sessionStorage.getItem('tick_notification_prev_group') !== null;

    if (groupId === 'ALL_GROUPS') {
      setSelectedGroupId('ALL_GROUPS');
      if (!isNotificationActive) {
        setCookie(COOKIE_LAST_SELECTED_GROUP, 'ALL_GROUPS');
      }
      setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
      try {
        const res = await api.groups.getAllMembers();
        const allMembers = res.members || [];
        setMembers(allMembers);
        if (allMembers.length > 0) {
          await cacheMembers(allMembers, 'ALL_GROUPS');
        }
      } catch (err) {
        console.warn('Failed fetching all members on switch to ALL_GROUPS:', err);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await api.groups.switch(groupId);
      if (res.token) {
        setToken(res.token);
      }
      setGroup(res.group);
      setSelectedGroupId(res.group.id);
      if (res.groups) setGroups(res.groups);
      if (!isNotificationActive) {
        setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
      }
      setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
      let newMembers = res.members;
      if (!newMembers || newMembers.length === 0) {
        try {
          const groupData = await api.groups.getMe();
          if (groupData.members && groupData.members.length > 0) {
            newMembers = groupData.members;
          }
        } catch {
          // ignore
        }
      }
      const finalMembers = newMembers || [];
      setMembers(finalMembers);
      if (finalMembers.length > 0) {
        await cacheMembers(finalMembers, res.group.id);
      }
      setUser((prev) => {
        if (!prev) return null;
        const currentMembership = res.groups?.find((g) => g.group_id === res.group.id);
        return {
          ...prev,
          group_id: res.group.id,
          role: currentMembership?.role || prev.role,
        };
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (name: string) => {
    setLoading(true);
    try {
      const res = await api.groups.create(name);
      if (res.token) {
        setToken(res.token);
      }
      setGroup(res.group);
      setSelectedGroupId(res.group.id);
      if (res.groups) setGroups(res.groups);
      setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
      setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
      setUser((prev) => (prev ? { ...prev, group_id: res.group.id, role: 'admin' } : null));
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      await cacheMembers(groupData.members);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (inviteCode: string) => {
    setLoading(true);
    try {
      const res = await api.groups.join(inviteCode);
      if (res.token) {
        setToken(res.token);
      }
      setGroup(res.group);
      setSelectedGroupId(res.group.id);
      if (res.groups) setGroups(res.groups);
      setCookie(COOKIE_LAST_SELECTED_GROUP, res.group.id);
      setCookie(COOKIE_LAST_ACTIVE_TIME, Date.now().toString());
      if (res.members) {
        setMembers(res.members);
        await cacheMembers(res.members);
      }
      setUser((prev) => {
        if (!prev) return null;
        const currentMembership = res.groups?.find((g) => g.group_id === res.group.id);
        return {
          ...prev,
          group_id: res.group.id,
          role: currentMembership?.role || 'member',
        };
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await api.groups.leave(groupId);
      if (res.token) {
        setToken(res.token);
      }
      setGroup(res.group);
      setSelectedGroupId(res.group?.id || null);
      if (res.groups) setGroups(res.groups);
      setUser((prev) => {
        if (!prev) return null;
        const currentMembership = res.groups?.find((g) => g.group_id === res.group.id);
        return {
          ...prev,
          group_id: res.group.id,
          role: currentMembership?.role || prev.role,
        };
      });
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      await cacheMembers(groupData.members);
    } finally {
      setLoading(false);
    }
  };

  const updateGroupName = async (name: string) => {
    const res = await api.groups.updateName(name);
    setGroup(res.group);
    setGroups((prev) =>
      prev.map((g) => (g.group_id === res.group.id ? { ...g, name: res.group.name } : g))
    );
  };

  const updateUserName = async (name: string) => {
    const res = await api.auth.updateProfile({ name });
    setUser(res.user);
    if (res.token) {
      setToken(res.token);
    }
    await refreshGroup();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        groups,
        members,
        loading,
        isAllGroups,
        selectedGroupId,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshGroup,
        switchGroup,
        createGroup,
        joinGroup,
        leaveGroup,
        updateGroupName,
        updateUserName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
