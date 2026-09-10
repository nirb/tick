import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { usePush } from './context/PushContext';
import { useLanguage } from './context/LanguageContext';
import { useInstall } from './context/InstallContext';
import { api } from './lib/api';
import { cacheTasks, getCachedTasks } from './lib/offline';
import type { TaskWithAssignee, TaskPriority } from './types';
import { Navbar } from './components/Navbar';
import { TaskCard } from './components/TaskCard';
import type { FilterTab } from './components/TaskFilters';
import { TaskModal } from './components/TaskModal';
import { GroupModal } from './components/GroupModal';
import { GroupSelectModal } from './components/GroupSelectModal';
import { ConfirmCompleteModal } from './components/ConfirmCompleteModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { InstallModal } from './components/InstallModal';
import { InstallBanner } from './components/InstallBanner';
import { AuthScreen } from './components/AuthScreen';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { useGroupPrompt } from './hooks/useGroupPrompt';
import { Plus, CheckCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, group, groups, members, loading: authLoading, switchGroup } = useAuth();
  const { showIOSGuide, setShowIOSGuide } = usePush();
  const { isInstallModalOpen, setIsInstallModalOpen } = useInstall();
  const { t } = useLanguage();

  const {
    isGroupSelectModalOpen,
    initialSelectedGroupId,
    initialAutoEnter,
    handleSelectGroup,
    handleCloseModal: handleCloseGroupSelectModal,
  } = useGroupPrompt({
    user,
    group,
    groups,
    loading: authLoading,
    switchGroup,
  });

  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Filter States
  const [currentTab, setCurrentTab] = useState<FilterTab>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Modals & UI States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskWithAssignee | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<TaskWithAssignee | null>(null);
  const [completingTask, setCompletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithAssignee | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

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

  // Auto-reload tasks when connectivity restores
  useEffect(() => {
    const handleOnline = () => {
      loadTasks();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadTasks]);

  useEffect(() => {
    if (user && group) {
      loadTasks();
    }
  }, [user?.id, group?.id, loadTasks]);

  const cleanTaskUrl = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('task=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, []);

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
      cleanTaskUrl();
    }
  }, [tasks, cleanTaskUrl]);

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
  const handleToggleStatus = (task: TaskWithAssignee) => {
    if (task.status !== 'completed') {
      // Require confirmation when marking task as completed
      setTaskToComplete(task);
    } else {
      executeToggleStatus(task, 'pending');
    }
  };

  const executeToggleStatus = async (task: TaskWithAssignee, targetStatus?: 'completed' | 'pending') => {
    const newStatus = targetStatus || (task.status === 'completed' ? 'pending' : 'completed');
    const now = Math.floor(Date.now() / 1000);

    setCompletingTask(true);
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
      setTaskToComplete(null);
    } catch (err: any) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      showToast(err.message || 'Failed to update task status', 'error');
    } finally {
      setCompletingTask(false);
    }
  };

  // Update Task Description / Checklist
  const handleUpdateDescription = async (taskId: string, newDescription: string | null) => {
    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, description: newDescription } : t))
    );

    try {
      const updated = await api.tasks.update(taskId, { description: newDescription });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated.task : t)));
      await cacheTasks(tasks);
    } catch (err: any) {
      showToast(err.message || 'Failed to update task description', 'error');
      loadTasks();
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
  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
    } else {
      executeDeleteTask(taskId);
    }
  };

  const executeDeleteTask = async (taskId: string) => {
    setDeletingTask(true);
    const prevTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.tasks.delete(taskId);
      showToast(t('toastTaskDeleted'), 'info');
      await cacheTasks(tasks.filter((t) => t.id !== taskId));
      setTaskToDelete(null);
    } catch (err: any) {
      setTasks(prevTasks);
      showToast(err.message || 'Failed to delete task', 'error');
    } finally {
      setDeletingTask(false);
    }
  };

  // Filter Tasks
  const now = Math.floor(Date.now() / 1000);
  const filteredTasks = tasks.filter((task) => {
    if (selectedAssignee) {
      if (selectedAssignee === 'unassigned') {
        if (task.assignee_id) return false;
      } else if (task.assignee_id !== selectedAssignee) {
        return false;
      }
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

  const FIVE_DAYS_IN_SECONDS = 5 * 86400;

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // 1. Status: completed last
    const statusRank = (s: string) => (s === 'completed' ? 2 : 1);
    if (statusRank(a.status) !== statusRank(b.status)) {
      return statusRank(a.status) - statusRank(b.status);
    }

    const aHasDeadline = typeof a.due_at === 'number' && a.due_at > 0;
    const bHasDeadline = typeof b.due_at === 'number' && b.due_at > 0;

    // Tasks without due date OR tasks with due date in less than 4 days
    const aInPriorityPool = !aHasDeadline || a.due_at! < now + FIVE_DAYS_IN_SECONDS;
    const bInPriorityPool = !bHasDeadline || b.due_at! < now + FIVE_DAYS_IN_SECONDS;

    // 2. Priority pool comes before tasks with distant deadlines (4+ days away)
    if (aInPriorityPool && !bInPriorityPool) return -1;
    if (!aInPriorityPool && bInPriorityPool) return 1;

    const prioA = priorityRank[a.priority] ?? 3;
    const prioB = priorityRank[b.priority] ?? 3;

    // 3. For tasks in the priority pool: sort according to priority (urgent > high > medium > low)
    if (aInPriorityPool && bInPriorityPool) {
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Tie-break for same priority:
      // Earlier due date first, then tasks without due date
      if (aHasDeadline && bHasDeadline) {
        if (a.due_at !== b.due_at) {
          return (a.due_at ?? 0) - (b.due_at ?? 0);
        }
      } else if (aHasDeadline && !bHasDeadline) {
        return -1;
      } else if (!aHasDeadline && bHasDeadline) {
        return 1;
      }

      return b.created_at - a.created_at;
    }

    // 4. For distant tasks (due date in 4+ days): sort by earlier due date first
    if (a.due_at !== b.due_at) {
      return (a.due_at ?? 0) - (b.due_at ?? 0);
    }

    // Tie-break for same deadline: priority, then newer created first
    if (prioA !== prioB) {
      return prioA - prioB;
    }

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
    return (
      <>
        <AuthScreen onShowToast={showToast} />
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onShowToast={showToast}
        onOpenGroup={() => setIsGroupModalOpen(true)}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        members={members}
        tasks={tasks}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
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
                onUpdateDescription={handleUpdateDescription}
                onShowToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (All Screen Sizes) */}
      <div className="fixed bottom-6 end-6 z-30">
        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          className="w-14 h-14 rounded-full glow-btn text-white flex items-center justify-center shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
          cleanTaskUrl();
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

      <GroupSelectModal
        isOpen={isGroupSelectModalOpen}
        groups={groups}
        currentGroupId={group?.id}
        initialSelectedGroupId={initialSelectedGroupId}
        initialAutoEnter={initialAutoEnter}
        onSelectGroup={handleSelectGroup}
        onClose={handleCloseGroupSelectModal}
      />

      <ConfirmCompleteModal
        isOpen={!!taskToComplete}
        task={taskToComplete}
        onConfirm={() => {
          if (taskToComplete) {
            executeToggleStatus(taskToComplete, 'completed');
          }
        }}
        onClose={() => {
          if (!completingTask) {
            setTaskToComplete(null);
          }
        }}
        loading={completingTask}
      />

      <ConfirmDeleteModal
        isOpen={!!taskToDelete}
        taskTitle={taskToDelete?.title}
        onConfirm={() => {
          if (taskToDelete) {
            executeDeleteTask(taskToDelete.id);
          }
        }}
        onClose={() => {
          if (!deletingTask) {
            setTaskToDelete(null);
          }
        }}
        loading={deletingTask}
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
