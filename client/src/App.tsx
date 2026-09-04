import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { usePush } from './context/PushContext';
import { api } from './lib/api';
import { cacheTasks, getCachedTasks } from './lib/offline';
import type { TaskWithAssignee, TaskPriority } from './types';
import { Navbar } from './components/Navbar';
import { TaskCard } from './components/TaskCard';
import { TaskFilters, type FilterTab } from './components/TaskFilters';
import { TaskModal } from './components/TaskModal';
import { HouseholdModal } from './components/HouseholdModal';
import { IOSInstallModal } from './components/IOSInstallModal';
import { AndroidInstallBanner } from './components/AndroidInstallBanner';
import { AuthScreen } from './components/AuthScreen';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { Plus, CheckCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, group, members, loading: authLoading } = useAuth();
  const { showIOSGuide, setShowIOSGuide } = usePush();

  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Filter States
  const [currentTab, setCurrentTab] = useState<FilterTab>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Modals & UI States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskWithAssignee | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Online / Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('You are back online!', 'success');
      loadTasks();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Working offline. Local changes will be saved.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Load Tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const res = await api.tasks.list();
      setTasks(res.tasks);
      await cacheTasks(res.tasks);
    } catch {
      // Offline fallback
      const cached = await getCachedTasks();
      if (cached) {
        setTasks(cached);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

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
      showToast('Task updated!', 'success');
    } else {
      const created = await api.tasks.create(data);
      // Join assignee info from members
      const assignee = members.find((m) => m.id === data.assignee_id);
      const newTask: TaskWithAssignee = {
        ...created.task,
        assignee_name: assignee?.name || null,
        assignee_avatar: assignee?.avatar_url || null,
        creator_name: user?.name || null,
      };
      setTasks((prev) => [newTask, ...prev]);
      showToast('Task created! 📋', 'success');
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
            ? 'Task completed! Scheduled next recurrence 🔁'
            : 'Task marked completed! 🎉',
          'success'
        );
        // Refresh to pick up any automatically generated recurring instances
        if (task.recurrence_rule) {
          loadTasks();
        }
      }
    } catch (err: any) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  // Nudge Assignee
  const handleNudge = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    try {
      const res = await api.tasks.nudge(taskId);
      if (res.push_sent > 0) {
        showToast(`Push reminder sent to ${target?.assignee_name || 'assignee'}! 🔔`, 'success');
      } else {
        showToast(`Nudge recorded (no active devices registered for ${target?.assignee_name}).`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not send nudge', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.tasks.delete(taskId);
      showToast('Task deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
      loadTasks();
    }
  };

  // Filter Tasks
  const now = Math.floor(Date.now() / 1000);
  const filteredTasks = tasks.filter((task) => {
    // Assignee filter
    if (selectedAssignee && task.assignee_id !== selectedAssignee) {
      return false;
    }

    // Tab filter
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onShowToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenHousehold={() => setIsHouseholdModalOpen(true)}
        onShowToast={showToast}
        isOnline={isOnline}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Header Title & Quick Create */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {group?.name || 'Family Tasks'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Organize, assign, and get things done together
            </p>
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Task</span>
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
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-sm mt-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {currentTab === 'completed'
                ? 'No completed tasks yet'
                : 'All caught up! 🎉'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              {currentTab === 'completed'
                ? 'Completed chores will show up here.'
                : 'Great job! Everything for this filter is done.'}
            </p>
            {currentTab !== 'completed' && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={handleToggleStatus}
                onNudge={handleNudge}
                onEdit={(t) => {
                  setTaskToEdit(t);
                  setIsTaskModalOpen(true);
                }}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (Mobile) */}
      <div className="sm:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 hover:bg-indigo-700 active:scale-95 transition-all"
          aria-label="Add Task"
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

      <HouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        onShowToast={showToast}
      />

      <IOSInstallModal
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />

      <AndroidInstallBanner />

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
