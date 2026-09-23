import React, { useMemo } from 'react';
import type { TaskWithAssignee, TaskPriority } from '../types';
import type { FilterTab } from './TaskFilters';
import { TaskCard } from './TaskCard';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, CalendarOff, CheckCircle, Plus, ChevronUp } from 'lucide-react';

interface CalendarDayViewProps {
  tasks: TaskWithAssignee[];
  currentTab: FilterTab;
  showFutureTasks: boolean;
  onToggleShowFutureTasks: () => void;
  onToggleStatus: (task: TaskWithAssignee) => void;
  onNudge: (taskId: string) => Promise<void>;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (taskId: string) => void;
  onUpdateDescription?: (taskId: string, description: string | null) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCreateTask: () => void;
}

interface DayGroup {
  dateKey: string;
  formattedDate: string;
  relativeText: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  isFuture: boolean;
  hasIncomplete: boolean;
  tasks: TaskWithAssignee[];
}

const priorityRank: Record<TaskPriority, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function getLocalDateKey(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  tasks,
  currentTab,
  showFutureTasks,
  onToggleShowFutureTasks,
  onToggleStatus,
  onNudge,
  onEdit,
  onDelete,
  onUpdateDescription,
  onShowToast,
  onOpenCreateTask,
}) => {
  const { t, language } = useLanguage();

  const { noDueDateTasks, hiddenFutureTasksCount, visibleDayGroups } = useMemo(() => {
    const groupsMap = new Map<string, TaskWithAssignee[]>();
    const noDue: TaskWithAssignee[] = [];

    for (const task of tasks) {
      if (typeof task.due_at === 'number' && task.due_at > 0) {
        const key = getLocalDateKey(task.due_at);
        const existing = groupsMap.get(key);
        if (existing) {
          existing.push(task);
        } else {
          groupsMap.set(key, [task]);
        }
      } else {
        noDue.push(task);
      }
    }

    const now = new Date();
    const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sortedDateKeys = Array.from(groupsMap.keys()).sort();

    const groups: DayGroup[] = sortedDateKeys.map((dateKey) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const targetDateOnly = new Date(y, m - 1, d);
      const diffDays = Math.round((targetDateOnly.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));

      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;
      const isPast = diffDays < 0;

      let relativeText = '';
      if (diffDays === 0) {
        relativeText = t('today');
      } else if (diffDays === 1) {
        relativeText = t('inOneDay');
      } else if (diffDays === 2) {
        relativeText = t('inTwoDays');
      } else if (diffDays > 2) {
        relativeText = t('inDays', { days: diffDays });
      } else if (diffDays === -1) {
        relativeText = t('oneDayAgo');
      } else if (diffDays === -2) {
        relativeText = t('twoDaysAgo');
      } else {
        relativeText = t('daysAgo', { days: Math.abs(diffDays) });
      }

      const formattedDate = dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        ...(dateObj.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
      });

      const groupTasks = groupsMap.get(dateKey) || [];

      // Sort tasks within this day
      groupTasks.sort((a, b) => {
        const statusRank = (s: string) => (s === 'completed' ? 2 : 1);
        if (statusRank(a.status) !== statusRank(b.status)) {
          return statusRank(a.status) - statusRank(b.status);
        }

        // Specific due times if set
        if (a.due_at && b.due_at && a.due_at !== b.due_at) {
          return a.due_at - b.due_at;
        }

        const prioA = priorityRank[a.priority] ?? 3;
        const prioB = priorityRank[b.priority] ?? 3;
        if (prioA !== prioB) return prioA - prioB;

        return b.created_at - a.created_at;
      });

      const hasIncomplete = groupTasks.some((t) => t.status !== 'completed');
      const isFuture = diffDays > 5 && (currentTab !== 'completed' ? hasIncomplete : false);

      return {
        dateKey,
        formattedDate,
        relativeText,
        isToday,
        isTomorrow,
        isPast,
        isFuture,
        hasIncomplete,
        tasks: groupTasks,
      };
    });

    // Sort tasks without due date
    noDue.sort((a, b) => {
      const statusRank = (s: string) => (s === 'completed' ? 2 : 1);
      if (statusRank(a.status) !== statusRank(b.status)) {
        return statusRank(a.status) - statusRank(b.status);
      }
      const prioA = priorityRank[a.priority] ?? 3;
      const prioB = priorityRank[b.priority] ?? 3;
      if (prioA !== prioB) return prioA - prioB;
      return b.created_at - a.created_at;
    });

    const hiddenFutureGroups = groups.filter((g) => g.isFuture);
    const hiddenCount = hiddenFutureGroups.reduce((acc, g) => acc + g.tasks.length, 0);
    const visibleGroups = showFutureTasks ? groups : groups.filter((g) => !g.isFuture);

    return {
      dayGroups: groups,
      noDueDateTasks: noDue,
      hiddenFutureTasksCount: hiddenCount,
      visibleDayGroups: visibleGroups,
    };
  }, [tasks, language, t, showFutureTasks, currentTab]);

  if (visibleDayGroups.length === 0 && noDueDateTasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-3xl p-8 sm:p-12 text-center border border-white/15 mt-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center mx-auto mb-4 shadow-sm shadow-sky-500/20">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {currentTab === 'completed' ? t('noCompletedTasks') : t('allCaughtUp')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xs mx-auto">
            {currentTab === 'completed' ? t('noCompletedDesc') : t('allCaughtUpDesc')}
          </p>
          {currentTab !== 'completed' && (
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-bold rounded-xl transition-all shadow-sm shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('createFirstTask')}</span>
            </button>
          )}
        </div>

        {/* Future Tasks Button if all tasks were hidden */}
        {hiddenFutureTasksCount > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onToggleShowFutureTasks}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-slate-200 text-xs font-bold transition-all hover:border-white/25 active:scale-95 shadow-md shadow-black/20 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>{t('showFutureTasks')}</span>
              <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-full text-[10px]">
                {hiddenFutureTasksCount}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day Groups */}
      {visibleDayGroups.map((group) => {
        const isOverdue = group.isPast && !group.isToday && group.hasIncomplete;

        return (
          <section key={group.dateKey} className="space-y-2.5">
            {/* Day Header: Date on the start side, "in x days..." replacing task count on the end side */}
            <div className="flex items-center justify-between pb-1.5 pt-2 border-b border-white/10 px-1">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                    group.isToday
                      ? 'bg-sky-500/25 border-sky-400/40 text-sky-300 shadow-sm shadow-sky-500/20'
                      : isOverdue
                      ? 'bg-rose-500/25 border-rose-400/40 text-rose-300'
                      : group.isTomorrow
                      ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {group.formattedDate}
                </h3>
              </div>

              {/* Replaced task count with "in x days..." badge */}
              <span
                className={`text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 transition-colors ${
                  isOverdue
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                    : group.isToday
                    ? 'bg-sky-500/25 text-sky-200 border-sky-400/40 shadow-xs shadow-sky-500/20'
                    : 'bg-white/10 text-slate-200 border-white/15'
                }`}
              >
                {group.relativeText}
              </span>
            </div>

            {/* Tasks in this Day */}
            <div className="space-y-3">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  hideDueBadge={true}
                  onToggleStatus={onToggleStatus}
                  onNudge={onNudge}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpdateDescription={onUpdateDescription}
                  onShowToast={onShowToast}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Tasks without Due Date */}
      {noDueDateTasks.length > 0 && (
        <section className="space-y-2.5 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 pt-2 border-b border-white/10 px-1">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shrink-0 bg-white/5 border-white/10 text-slate-400">
                <CalendarOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-300 tracking-tight truncate">
                {t('noDueDate')}
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 shrink-0">
              {noDueDateTasks.length}
            </span>
          </div>

          {/* Tasks without due date */}
          <div className="space-y-3">
            {noDueDateTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                hideDueBadge={true}
                onToggleStatus={onToggleStatus}
                onNudge={onNudge}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateDescription={onUpdateDescription}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </section>
      )}

      {/* Show / Hide Future Tasks Button */}
      {hiddenFutureTasksCount > 0 && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={onToggleShowFutureTasks}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-slate-200 text-xs font-bold transition-all hover:border-white/25 active:scale-95 shadow-md shadow-black/20 cursor-pointer"
          >
            {showFutureTasks ? (
              <>
                <ChevronUp className="w-4 h-4 text-sky-400" />
                <span>{t('hideFutureTasks')}</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{t('showFutureTasks')}</span>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-full text-[10px]">
                  {hiddenFutureTasksCount}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
