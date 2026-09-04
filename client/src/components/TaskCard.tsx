import React, { useState } from 'react';
import type { TaskWithAssignee } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Check,
  Clock,
  Repeat,
  BellRing,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
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
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = isToday ? `Today at ${timeStr}` : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;

    return { text: dateStr, isOverdue };
  };

  const dueInfo = formatDue(task.due_at);

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
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
      className={`group relative bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
        isCompleted
          ? 'border-slate-200 bg-slate-50/60 opacity-75'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(task)}
          className={`w-6 h-6 mt-0.5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 hover:border-indigo-500 bg-white'
          }`}
          aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
        >
          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>

            {/* Menu Trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Task options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 text-xs">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(task);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(task.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.description && (
            <p className={`text-xs sm:text-sm mt-1 leading-relaxed line-clamp-2 ${
              isCompleted ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {task.description}
            </p>
          )}

          {/* Badges and Assignee */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            {/* Priority Badge */}
            <span
              className={`px-2 py-0.5 rounded-full border capitalize ${
                priorityColors[task.priority] || priorityColors.medium
              }`}
            >
              {task.priority}
            </span>

            {/* Recurrence Rule */}
            {task.recurrence_rule && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                <Repeat className="w-3 h-3" />
                {task.recurrence_rule.includes('DAILY')
                  ? 'Daily'
                  : task.recurrence_rule.includes('WEEKLY')
                  ? 'Weekly'
                  : 'Recurring'}
              </span>
            )}

            {/* Due Date */}
            {dueInfo && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  dueInfo.isOverdue
                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-medium'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {dueInfo.isOverdue ? <Clock className="w-3 h-3 text-rose-600" /> : <Calendar className="w-3 h-3" />}
                {dueInfo.text}
              </span>
            )}

            {/* Assignee Chip */}
            <div className="ml-auto flex items-center gap-2">
              {task.assignee_name ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isAssignedToMe
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{task.assignee_avatar || '👤'}</span>
                  <span>{isAssignedToMe ? 'You' : task.assignee_name}</span>
                </span>
              ) : (
                <span className="text-slate-400 text-xs italic">Unassigned</span>
              )}

              {/* Nudge Assignee Button (FR-PUSH-2) */}
              {!isCompleted && isAssignedToOther && (
                <button
                  onClick={handleNudge}
                  disabled={nudging || nudged}
                  title={`Send a push reminder to ${task.assignee_name}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    nudged
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200 active:scale-95'
                  }`}
                >
                  <BellRing className={`w-3 h-3 ${nudging ? 'animate-bounce' : ''}`} />
                  {nudged ? 'Nudged! 🔔' : 'Nudge'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
