import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Group, GroupMembership, User } from '../types';
import { api, setToken } from '../lib/api';
import { cacheMembers, getCachedMembers } from '../lib/offline';

interface AuthContextType {
  user: User | null;
  group: Group | null;
  groups: GroupMembership[];
  members: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, groupName?: string, inviteCode?: string) => Promise<void>;
  loginWithGoogle: (data: { credential?: string; email?: string; name?: string; avatarUrl?: string; inviteCode?: string }) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  const fetchProfileAndGroup = async () => {
    try {
      const { user: currentUser, group: currentGroup, groups: userGroups } = await api.auth.getMe();
      setUser(currentUser);
      setGroup(currentGroup);
      if (userGroups) setGroups(userGroups);

      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } catch {
      const cached = await getCachedMembers();
      if (cached) setMembers(cached);
      setUser(null);
      setGroup(null);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndGroup();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      setUser(res.user);
      setGroup(res.group);
      if (res.groups) setGroups(res.groups);
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, groupName?: string, inviteCode?: string) => {
    setLoading(true);
    try {
      const res = await api.auth.register(name, email, password, groupName, inviteCode);
      setToken(res.token);
      setUser(res.user);
      setGroup(res.group);
      if (res.groups) setGroups(res.groups);
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (data: { credential?: string; email?: string; name?: string; avatarUrl?: string; inviteCode?: string }) => {
    setLoading(true);
    try {
      const res = await api.auth.google(data);
      setToken(res.token);
      setUser(res.user);
      setGroup(res.group);
      if (res.groups) setGroups(res.groups);
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      if (groupData.groups) setGroups(groupData.groups);
      await cacheMembers(groupData.members);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
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
    setLoading(true);
    try {
      const res = await api.groups.switch(groupId);
      if (res.token) {
        setToken(res.token);
      }
      setGroup(res.group);
      if (res.groups) setGroups(res.groups);
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
      if (res.groups) setGroups(res.groups);
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
      if (res.groups) setGroups(res.groups);
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
