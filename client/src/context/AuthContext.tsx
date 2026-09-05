import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Group, User } from '../types';
import { api, setToken } from '../lib/api';
import { cacheMembers, getCachedMembers } from '../lib/offline';

interface AuthContextType {
  user: User | null;
  group: Group | null;
  members: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, groupName?: string, inviteCode?: string) => Promise<void>;
  loginWithGoogle: (data: { credential?: string; email?: string; name?: string; avatarUrl?: string; inviteCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshGroup: () => Promise<void>;
  updateGroupName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndGroup = async () => {
    try {
      const { user: currentUser, group: currentGroup } = await api.auth.getMe();
      setUser(currentUser);
      setGroup(currentGroup);

      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
      await cacheMembers(groupData.members);
    } catch {
      const cached = await getCachedMembers();
      if (cached) setMembers(cached);
      setUser(null);
      setGroup(null);
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
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
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
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
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
      const groupData = await api.groups.getMe();
      setMembers(groupData.members);
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
    setMembers([]);
  };

  const refreshGroup = async () => {
    if (!user) return;
    try {
      const groupData = await api.groups.getMe();
      setGroup(groupData.group);
      setMembers(groupData.members);
      await cacheMembers(groupData.members);
    } catch (e) {
      console.warn('Failed to refresh group:', e);
    }
  };

  const updateGroupName = async (name: string) => {
    const res = await api.groups.updateName(name);
    setGroup(res.group);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        members,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshGroup,
        updateGroupName,
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
