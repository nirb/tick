import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { useLanguage } from '../context/LanguageContext';
import { useInstall } from '../context/InstallContext';
import type { GroupMembership } from '../types';
import {
  Menu,
  X,
  Bell,
  BellOff,
  Send,
  LogOut,
  Globe,
  Pencil,
  Check,
  RefreshCw,
  Download,
  Plus,
  ChevronDown,
  Users,
  Settings,
} from 'lucide-react';
import { Avatar } from './Avatar';

interface NavbarProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onCreateTask: () => void;
  onOpenGroup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onShowToast,
  onCreateTask,
  onOpenGroup,
}) => {
  const { user, group, groups, switchGroup, createGroup, logout, updateUserName } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, sendTestNotification, loading: pushLoading } = usePush();
  const { language, toggleLanguage, t } = useLanguage();
  const { isInstalled, promptInstall } = useInstall();

  // Menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroupLoading, setCreatingGroupLoading] = useState(false);
  const [switchingGroupId, setSwitchingGroupId] = useState<string | null>(null);

  // Profile editing
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [savingUserName, setSavingUserName] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(target)) {
        setShowGroupMenu(false);
        setIsCreatingGroup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleGroupMenu = () => {
    setShowGroupMenu((prev) => {
      const next = !prev;
      if (next) setIsMenuOpen(false);
      return next;
    });
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  const toggleMainMenu = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setShowGroupMenu(false);
        setIsCreatingGroup(false);
      }
      return next;
    });
  };

  const displayGroups: GroupMembership[] =
    groups.length > 0
      ? groups
      : group
      ? [
          {
            group_id: group.id,
            name: group.name,
            invite_code: group.invite_code,
            role: user?.role || 'member',
            joined_at: group.created_at,
          },
        ]
      : [];

  const handleSwitchGroup = async (groupId: string) => {
    if (groupId === group?.id) {
      setShowGroupMenu(false);
      return;
    }
    setSwitchingGroupId(groupId);
    try {
      await switchGroup(groupId);
      setShowGroupMenu(false);
      onShowToast(t('toastSwitchedGroup'), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to switch group', 'error');
    } finally {
      setSwitchingGroupId(null);
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    setCreatingGroupLoading(true);
    try {
      await createGroup(trimmed);
      setNewGroupName('');
      setIsCreatingGroup(false);
      setShowGroupMenu(false);
      onShowToast(t('toastGroupCreated'), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroupLoading(false);
    }
  };

  const handlePushClick = async () => {
    if (!isSubscribed) {
      setIsMenuOpen(false);
      const ok = await subscribe();
      if (ok) {
        onShowToast(t('toastPushEnabled'), 'success');
      }
    }
  };

  const handleTestPush = async () => {
    setIsMenuOpen(false);
    try {
      const res = await sendTestNotification();
      if (res.sent > 0) {
        onShowToast(t('toastTestPushSent'), 'success');
      } else {
        onShowToast(t('toastNoActiveSubs'), 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send test notification', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    setIsMenuOpen(false);
    await unsubscribe();
    onShowToast(t('toastUnsubscribed'), 'info');
  };

  const handleStartEditingUserName = () => {
    if (!user) return;
    setEditedUserName(user.name);
    setIsEditingUserName(true);
  };

  const handleCancelEditingUserName = () => {
    setIsEditingUserName(false);
    setEditedUserName('');
  };

  const handleSaveUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editedUserName.trim();
    if (!trimmed || trimmed === user?.name) {
      setIsEditingUserName(false);
      return;
    }

    setSavingUserName(true);
    try {
      await updateUserName(trimmed);
      setIsEditingUserName(false);
      setIsMenuOpen(false);
      onShowToast(t('toastUserNameUpdated'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to update name', 'error');
    } finally {
      setSavingUserName(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/12 shadow-lg shadow-black/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Group Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-sky-500/25 shrink-0">
            ✓
          </div>

          <div className="relative min-w-0" ref={groupMenuRef}>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleGroupMenu}
                className="group flex items-center gap-1.5 sm:gap-2 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl max-w-full"
              >
                <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight gradient-text truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                  {group?.name || t('appName')}
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    showGroupMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <span className="hidden md:inline text-xs text-slate-400 font-medium truncate max-w-xs">
                {t('appTagline')}
              </span>
            </div>

            {showGroupMenu && (
              <div className="absolute start-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 p-2 z-40 text-xs text-slate-100 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    {t('myGroups')}
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold">
                    {displayGroups.length}
                  </span>
                </div>

                {/* List of groups */}
                <div className="max-h-52 overflow-y-auto space-y-1 my-1">
                  {displayGroups.map((g) => {
                    const isActive = g.group_id === group?.id;
                    const isSwitching = switchingGroupId === g.group_id;
                    return (
                      <button
                        key={g.group_id}
                        onClick={() => handleSwitchGroup(g.group_id)}
                        disabled={isSwitching}
                        className={`w-full text-start px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                          isActive
                            ? 'bg-sky-500/20 text-white font-bold border border-sky-400/40 shadow-sm shadow-sky-500/10'
                            : 'hover:bg-white/10 text-slate-200 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : isSwitching ? (
                            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{g.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0 border ${
                            g.role === 'admin'
                              ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                              : 'bg-white/10 text-slate-300 border-white/15'
                          }`}
                        >
                          {g.role === 'admin' ? t('adminRole') : t('memberRole')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Creation inline form or Action Buttons */}
                <div className="pt-1.5 border-t border-white/10 space-y-1">
                  {isCreatingGroup ? (
                    <form onSubmit={handleCreateGroupSubmit} className="p-1 space-y-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t('newGroupName')}
                        maxLength={50}
                        autoFocus
                        disabled={creatingGroupLoading}
                        className="w-full px-2.5 py-1 bg-slate-950/80 border border-sky-400/50 rounded-lg text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingGroup(false);
                            setNewGroupName('');
                          }}
                          disabled={creatingGroupLoading}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={creatingGroupLoading || !newGroupName.trim()}
                          className="px-2.5 py-1 text-[11px] bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {creatingGroupLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                          <span>{t('create')}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsCreatingGroup(true)}
                      className="w-full text-start px-2.5 py-1.5 hover:bg-white/10 rounded-lg flex items-center gap-2 text-sky-300 font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('createNewGroup')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenGroup();
                    }}
                    className="w-full text-start px-2.5 py-1.5 hover:bg-white/10 rounded-lg flex items-center gap-2 text-slate-300 font-semibold transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('manageGroup')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Hamburger Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Create Task Button */}
          <button
            onClick={onCreateTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 glow-btn text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-sky-500/25"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">{t('createTask')}</span>
          </button>

          {/* Menu (3 horizontal lines) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMainMenu}
              aria-label="Menu"
              className="p-2 sm:p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {isMenuOpen && (
              <div className="absolute end-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 p-3 z-50 text-slate-100 animate-in fade-in zoom-in-95 space-y-3">
                {/* User Profile Info */}
                {user && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {isEditingUserName ? (
                      <form onSubmit={handleSaveUserName} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editedUserName}
                          onChange={(e) => setEditedUserName(e.target.value)}
                          placeholder={t('namePlaceholder')}
                          autoFocus
                          maxLength={40}
                          className="flex-1 min-w-0 px-2.5 py-1 text-xs font-bold text-white border border-sky-400/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400 bg-slate-900"
                          disabled={savingUserName}
                        />
                        <button
                          type="submit"
                          disabled={savingUserName || !editedUserName.trim()}
                          title={t('save')}
                          className="p-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                        >
                          {savingUserName ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditingUserName}
                          disabled={savingUserName}
                          title={t('cancel')}
                          className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar url={user.avatar_url} name={user.name} size="md" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{user.name}</span>
                              <button
                                onClick={handleStartEditingUserName}
                                title={t('editUserName')}
                                className="p-0.5 text-slate-400 hover:text-sky-300 rounded transition-colors shrink-0"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block">{user.email}</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 border ${
                            user.role === 'admin'
                              ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                              : 'bg-white/10 text-slate-300 border-white/15'
                          }`}
                        >
                          {user.role === 'admin' ? t('adminRole') : t('memberRole')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Menu Items */}
                <div className="space-y-1">
                  {/* Language Switcher */}
                  <button
                    onClick={() => {
                      toggleLanguage();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 hover:bg-white/10 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>{language === 'en' ? 'Language' : 'שפה'}</span>
                    </span>
                    <span className="text-[11px] font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-lg">
                      {language === 'en' ? 'עברית' : 'English'}
                    </span>
                  </button>

                  {/* Push Notifications */}
                  {isSubscribed ? (
                    <div className="space-y-1 pt-1">
                      <div className="w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200">
                        <span className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-emerald-400" />
                          <span>{t('pushActiveNotice')}</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-lg">
                          {t('pushOn')}
                        </span>
                      </div>
                      <div className="ps-3 space-y-0.5">
                        <button
                          onClick={handleTestPush}
                          className="w-full px-2.5 py-1.5 hover:bg-white/10 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-400" />
                          <span>{t('sendTestNotification')}</span>
                        </button>
                        <button
                          onClick={handleUnsubscribe}
                          className="w-full px-2.5 py-1.5 hover:bg-rose-500/15 rounded-lg flex items-center gap-2 text-xs font-medium text-rose-300 transition-colors"
                        >
                          <BellOff className="w-3.5 h-3.5" />
                          <span>{t('turnOffNotifications')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handlePushClick}
                      disabled={pushLoading}
                      className="w-full px-2.5 py-2 hover:bg-white/10 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <BellOff className="w-4 h-4 text-slate-400" />
                        <span>{t('enablePush')}</span>
                      </span>
                      <span className="text-[11px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        {pushLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                        <span>{t('enablePush')}</span>
                      </span>
                    </button>
                  )}

                  {/* Install App (if available) */}
                  {!isInstalled && (
                    <button
                      onClick={() => {
                        promptInstall();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-2 hover:bg-sky-500/20 text-sky-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{t('installTickApp')}</span>
                    </button>
                  )}
                </div>

                {/* Sign Out */}
                {user && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-2.5 py-2 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>{t('signOut')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
