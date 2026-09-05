import React, { useState } from 'react';
import type { TaskWithAssignee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Check,
  Clock,
  Repeat,
  BellRing,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  ChevronDown,
} from 'lucide-react';

interface TaskCardProps {
  task: TaskWithAssignee;
  onToggleStatus: (task: TaskWithAssignee) => void;
  onNudge: (taskId: string) => Promise<void>;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onNudge,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const isCompleted = task.status === 'completed';
  const isAssignedToMe = user && task.assignee_id === user.id;
  const isAssignedToOther = user && task.assignee_id && task.assignee_id !== user.id;

  // Format Due Date
  const formatDue = (epoch: number | null) => {
    if (!epoch) return null;
    const date = new Date(epoch * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isOverdue = epoch < Math.floor(Date.now() / 1000) && !isCompleted;

    const timeStr = date.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = isToday
      ? t('todayAt', { time: timeStr })
      : date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;

    return { text: dateStr, isOverdue };
  };

  const dueInfo = formatDue(task.due_at);

  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-200 border-slate-400/30 font-semibold',
    medium: 'bg-sky-500/20 text-sky-200 border-sky-400/40 font-semibold',
    high: 'bg-amber-500/20 text-amber-200 border-amber-400/40 font-semibold',
    urgent: 'bg-rose-500/25 text-rose-200 border-rose-400/40 font-bold shadow-sm shadow-rose-500/20',
  };

  const handleNudge = async () => {
    setNudging(true);
    try {
      await onNudge(task.id);
      setNudged(true);
      setTimeout(() => setNudged(false), 3000);
    } finally {
      setNudging(false);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
        isCompleted
          ? 'border-white/5 bg-slate-900/40 opacity-60'
          : 'bg-slate-900/65 backdrop-blur-md border-white/12 hover:border-sky-400/50 hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(task)}
          className={`w-6 h-6 mt-0.5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
            isCompleted
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-md shadow-emerald-500/30'
              : 'border-white/25 hover:border-sky-400 bg-slate-950/60 text-transparent'
          }`}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3
                onClick={() => task.description && setIsDescriptionExpanded(!isDescriptionExpanded)}
                className={`text-sm sm:text-base font-bold leading-snug break-words tracking-tight text-start ${
                  isCompleted ? 'line-through text-slate-400' : 'text-white'
                } ${task.description ? 'cursor-pointer hover:text-sky-300 transition-colors select-none' : ''}`}
                role={task.description ? 'button' : undefined}
                aria-expanded={task.description ? isDescriptionExpanded : undefined}
                tabIndex={task.description ? 0 : undefined}
                onKeyDown={(e) => {
                  if (task.description && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setIsDescriptionExpanded(!isDescriptionExpanded);
                  }
                }}
              >
                {task.title}
              </h3>
              {task.description && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="p-0.5 text-slate-400 hover:text-sky-300 transition-colors shrink-0"
                  aria-label={isDescriptionExpanded ? 'Collapse description' : 'Expand description'}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isDescriptionExpanded ? 'rotate-180 text-sky-400' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Menu Trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Task options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute end-0 mt-1 w-32 bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 py-1.5 z-20 text-xs text-slate-200">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(task);
                    }}
                    className="w-full px-3 py-2 text-start hover:bg-white/10 flex items-center gap-2 text-slate-200 transition-colors font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-400" /> {t('edit')}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(task.id);
                    }}
                    className="w-full px-3 py-2 text-start hover:bg-rose-500/20 flex items-center gap-2 text-rose-400 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" /> {t('delete')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.description && isDescriptionExpanded && (
            <p
              className={`text-xs sm:text-sm mt-2 p-2.5 rounded-xl bg-slate-950/50 border border-white/8 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-top-1 ${
                isCompleted ? 'text-slate-500' : 'text-slate-200 font-normal'
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Badges and Assignee */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            {/* Priority Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full border capitalize ${
                priorityColors[task.priority] || priorityColors.medium
              }`}
            >
              {t(task.priority)}
            </span>

            {/* Recurrence Rule */}
            {task.recurrence_rule && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-semibold">
                <Repeat className="w-3 h-3" />
                {task.recurrence_rule.includes('DAILY')
                  ? t('daily')
                  : task.recurrence_rule.includes('WEEKLY')
                  ? t('weekly')
                  : t('recurring')}
              </span>
            )}

            {/* Due Date */}
            {dueInfo && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-semibold ${
                  dueInfo.isOverdue
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                    : 'bg-white/10 text-slate-200 border-white/15'
                }`}
              >
                {dueInfo.isOverdue ? <Clock className="w-3 h-3 text-rose-300" /> : <Calendar className="w-3 h-3 text-sky-400" />}
                {dueInfo.text}
              </span>
            )}

            {/* Assignee Chip */}
            <div className="ms-auto flex items-center gap-2">
              {task.assignee_name ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isAssignedToMe
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                      : 'bg-white/10 text-slate-200 border-white/15'
                  }`}
                >
                  <span className="text-sm">{task.assignee_avatar || '👤'}</span>
                  <span>{isAssignedToMe ? t('you') : task.assignee_name}</span>
                </span>
              ) : (
                <span className="text-slate-400 text-xs italic font-medium">{t('unassigned')}</span>
              )}

              {/* Nudge Assignee Button (FR-PUSH-2) */}
              {!isCompleted && isAssignedToOther && (
                <button
                  onClick={handleNudge}
                  disabled={nudging || nudged}
                  title={`Send a push reminder to ${task.assignee_name}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    nudged
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30 active:scale-95 shadow-sm shadow-amber-500/10'
                  }`}
                >
                  <BellRing className={`w-3 h-3 ${nudging ? 'animate-bounce' : ''}`} />
                  {nudged ? t('nudged') : t('nudge')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
