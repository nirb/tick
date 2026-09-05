import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { usePush } from './context/PushContext';
import { useLanguage } from './context/LanguageContext';
import { useInstall } from './context/InstallContext';
import { api } from './lib/api';
import { cacheTasks, getCachedTasks } from './lib/offline';
import type { TaskWithAssignee, TaskPriority, GroupMembership } from './types';
import { Navbar } from './components/Navbar';
import { TaskCard } from './components/TaskCard';
import { TaskFilters, type FilterTab } from './components/TaskFilters';
import { TaskModal } from './components/TaskModal';
import { GroupModal } from './components/GroupModal';
import { InstallModal } from './components/InstallModal';
import { InstallBanner } from './components/InstallBanner';
import { AuthScreen } from './components/AuthScreen';
import { ToastContainer, type ToastMessage } from './components/Toast';
import {
  Plus,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  Users,
  Check,
  Settings,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    user,
    group,
    groups,
    switchGroup,
    createGroup,
    members,
    loading: authLoading,
  } = useAuth();
  const { showIOSGuide, setShowIOSGuide } = usePush();
  const { isInstallModalOpen, setIsInstallModalOpen } = useInstall();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [, setIsOnline] = useState(navigator.onLine);

  // Filter States
  const [currentTab, setCurrentTab] = useState<FilterTab>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Group Switcher States
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroupLoading, setCreatingGroupLoading] = useState(false);
  const [switchingGroupId, setSwitchingGroupId] = useState<string | null>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  // Modals & UI States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskWithAssignee | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Close group menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
        setIsCreatingGroup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      showToast(t('toastSwitchedGroup'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to switch group', 'error');
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
      showToast(t('toastGroupCreated'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroupLoading(false);
    }
  };

  // Online / Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(t('toastBackOnline'), 'success');
      loadTasks();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(t('toastWorkingOffline'), 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast, t]);

  // Load Tasks
  const loadTasks = useCallback(async () => {
    if (!user || !group) return;
    setLoadingTasks(true);
    try {
      const res = await api.tasks.list();
      setTasks(res.tasks);
      await cacheTasks(res.tasks, group.id);
    } catch {
      // Offline fallback
      const cached = await getCachedTasks(group.id);
      if (cached) {
        setTasks(cached);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [user, group]);

  useEffect(() => {
    if (user && group) {
      loadTasks();
    }
  }, [user?.id, group?.id, loadTasks]);

  // Check URL query parameters for task deep linking (?task=UUID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('task');
    if (taskId && tasks.length > 0) {
      const target = tasks.find((t) => t.id === taskId);
      if (target) {
        setTaskToEdit(target);
        setIsTaskModalOpen(true);
      }
    }
  }, [tasks]);

  // Handle Task Create/Update
  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    assignee_id?: string | null;
    priority: TaskPriority;
    due_at?: number | null;
    recurrence_rule?: string | null;
  }) => {
    if (taskToEdit) {
      const updated = await api.tasks.update(taskToEdit.id, data);
      setTasks((prev) => prev.map((t) => (t.id === taskToEdit.id ? updated.task : t)));
      showToast(t('toastTaskUpdated'), 'success');
    } else {
      const created = await api.tasks.create(data);
      const assignee = members.find((m) => m.id === data.assignee_id);
      const newTask: TaskWithAssignee = {
        ...created.task,
        assignee_name: assignee?.name || null,
        assignee_avatar: assignee?.avatar_url || null,
        creator_name: user?.name || null,
      };
      setTasks((prev) => [newTask, ...prev]);
      showToast(t('toastTaskCreated'), 'success');
    }
    await cacheTasks(tasks);
    setTaskToEdit(null);
  };

  // Toggle Status
  const handleToggleStatus = async (task: TaskWithAssignee) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const now = Math.floor(Date.now() / 1000);

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? now : null }
          : t
      )
    );

    try {
      const updated = await api.tasks.update(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));

      if (newStatus === 'completed') {
        showToast(
          task.recurrence_rule
            ? t('toastTaskCompletedRecurring')
            : t('toastTaskCompleted'),
          'success'
        );
        if (task.recurrence_rule) {
          loadTasks();
        }
      }
    } catch (err: any) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  // Nudge Assignee
  const handleNudge = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const assigneeName = target?.assignee_name || t('unassigned');
    try {
      const res = await api.tasks.nudge(taskId);
      if (res.push_sent > 0) {
        showToast(t('toastNudgeSent', { name: assigneeName }), 'success');
      } else {
        showToast(t('toastNudgeNoSubs', { name: assigneeName }), 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not send nudge', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t('deleteTaskConfirm'))) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.tasks.delete(taskId);
      showToast(t('toastTaskDeleted'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
      loadTasks();
    }
  };

  // Filter Tasks
  const now = Math.floor(Date.now() / 1000);
  const filteredTasks = tasks.filter((task) => {
    if (selectedAssignee && task.assignee_id !== selectedAssignee) {
      return false;
    }

    if (currentTab === 'all') return task.status !== 'completed';
    if (currentTab === 'mine') return task.assignee_id === user?.id && task.status !== 'completed';
    if (currentTab === 'due_soon') {
      return (
        task.status !== 'completed' &&
        task.due_at !== null &&
        task.due_at <= now + 86400 * 2
      );
    }
    if (currentTab === 'completed') return task.status === 'completed';

    return true;
  });

  const priorityRank: Record<TaskPriority, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // 1. Status: completed last
    const statusRank = (s: string) => (s === 'completed' ? 2 : 1);
    if (statusRank(a.status) !== statusRank(b.status)) {
      return statusRank(a.status) - statusRank(b.status);
    }

    // 2. Day bucket of effective date: due_at if set, otherwise created_at
    const dateA = a.due_at !== null ? a.due_at : a.created_at;
    const dateB = b.due_at !== null ? b.due_at : b.created_at;

    const dA = new Date(dateA * 1000);
    const dB = new Date(dateB * 1000);
    const dayA = `${dA.getFullYear()}-${String(dA.getMonth() + 1).padStart(2, '0')}-${String(dA.getDate()).padStart(2, '0')}`;
    const dayB = `${dB.getFullYear()}-${String(dB.getMonth() + 1).padStart(2, '0')}-${String(dB.getDate()).padStart(2, '0')}`;

    if (dayA !== dayB) {
      return dayA.localeCompare(dayB);
    }

    // 3. Priority: urgent > high > medium > low
    const prioA = priorityRank[a.priority] ?? 3;
    const prioB = priorityRank[b.priority] ?? 3;
    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 4. Exact timestamp within the day and priority
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    // 5. Tie-break: newer created first
    return b.created_at - a.created_at;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onShowToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onShowToast={showToast} />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Header Title & Quick Create */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative" ref={groupMenuRef}>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => {
                  setShowGroupMenu(!showGroupMenu);
                  setIsCreatingGroup(false);
                  setNewGroupName('');
                }}
                className="group flex items-center gap-2 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
              >
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight gradient-text">
                  {group?.name || t('appName')}
                </h2>
                <ChevronDown
                  className={`w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    showGroupMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
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
                      setIsGroupModalOpen(true);
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

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 glow-btn text-white text-sm font-bold rounded-xl"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('createTask')}</span>
          </button>
        </div>

        {/* Filters */}
        <TaskFilters
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          selectedAssignee={selectedAssignee}
          onAssigneeChange={setSelectedAssignee}
          members={members}
          tasks={tasks}
        />

        {/* Task List */}
        {loadingTasks && tasks.length === 0 ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="glass rounded-3xl p-8 sm:p-12 text-center border border-white/15 mt-4 bg-slate-900/60 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center mx-auto mb-4 shadow-sm shadow-sky-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">
              {currentTab === 'completed'
                ? t('noCompletedTasks')
                : t('allCaughtUp')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xs mx-auto">
              {currentTab === 'completed'
                ? t('noCompletedDesc')
                : t('allCaughtUpDesc')}
            </p>
            {currentTab !== 'completed' && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-bold rounded-xl transition-all shadow-sm shadow-sky-500/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('createFirstTask')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={handleToggleStatus}
                onNudge={handleNudge}
                onEdit={(tCard) => {
                  setTaskToEdit(tCard);
                  setIsTaskModalOpen(true);
                }}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (Mobile) */}
      <div className="sm:hidden fixed bottom-6 end-6 z-30">
        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          className="w-14 h-14 rounded-full glow-btn text-white flex items-center justify-center shadow-xl shadow-sky-500/30 active:scale-95 transition-all"
          aria-label={t('createTask')}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Modals & Banners */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSubmit={handleSaveTask}
        members={members}
        taskToEdit={taskToEdit}
      />

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onShowToast={showToast}
      />

      <InstallModal
        isOpen={isInstallModalOpen || showIOSGuide}
        onClose={() => {
          setIsInstallModalOpen(false);
          setShowIOSGuide(false);
        }}
      />

      <InstallBanner />

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
