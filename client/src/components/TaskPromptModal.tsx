import React, { useEffect, useState } from 'react';
import type { TaskWithAssignee, ChecklistItemStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Repeat,
  Pencil,
  Check,
  CheckSquare,
  Copy,
  Bell,
} from 'lucide-react';
import { parseTaskContent, serializeTaskContent, getChecklistStats } from '../lib/taskContent';
import { Avatar } from './Avatar';
import { HyperlinkText } from './HyperlinkText';

interface TaskPromptModalProps {
  isOpen: boolean;
  task: TaskWithAssignee | null;
  onClose: () => void;
  onComplete: (task: TaskWithAssignee) => void;
  onSnooze: (task: TaskWithAssignee, minutes: number) => void;
  onEdit?: (task: TaskWithAssignee) => void;
  onUpdateDescription?: (taskId: string, newDescription: string | null) => void;
  completing?: boolean;
}

export const TaskPromptModal: React.FC<TaskPromptModalProps> = ({
  isOpen,
  task,
  onClose,
  onComplete,
  onSnooze,
  onEdit,
  onUpdateDescription,
  completing = false,
}) => {
  const { t, language } = useLanguage();
  const [copiedDescription, setCopiedDescription] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !completing) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, completing]);

  if (!isOpen || !task) return null;

  const content = parseTaskContent(task.description);
  const isChecklist = content?.type === 'checklist';
  const checklistStats = isChecklist ? getChecklistStats(content.checklist) : null;

  const priorityColors = {
    low: 'bg-white/15 text-white border-white/35 font-semibold',
    medium: 'bg-blue-500/20 text-blue-200 border-blue-400/40 font-semibold',
    high: 'bg-orange-500/20 text-orange-200 border-orange-400/40 font-semibold',
    urgent: 'bg-red-500/25 text-red-200 border-red-400/40 font-bold shadow-sm shadow-red-500/20',
  };

  const priorityLabels = {
    low: t('low'),
    medium: t('medium'),
    high: t('high'),
    urgent: t('urgent'),
  };

  const handleCopyDescription = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content || content.type !== 'description' || !content.description) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content.description);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = content.description;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleToggleChecklistItem = (index: number) => {
    if (!content || content.type !== 'checklist' || !onUpdateDescription) return;
    const updatedChecklist = content.checklist.map((item, i) => {
      if (i === index) {
        const nextStatus: ChecklistItemStatus = item.status === 'done' ? 'not done' : 'done';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    const serialized = serializeTaskContent({
      type: 'checklist',
      checklist: updatedChecklist,
    });
    onUpdateDescription(task.id, serialized);
  };

  // Format Due Date & Time
  let formattedDue: string | null = null;
  if (task.due_at) {
    const d = new Date(task.due_at * 1000);
    formattedDue = d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const snoozeOptions = [
    { label: t('snooze15m'), minutes: 15 },
    { label: t('snooze30m'), minutes: 30 },
    { label: t('snooze1h'), minutes: 60 },
    { label: t('snooze2h'), minutes: 120 },
    { label: t('snooze6h'), minutes: 360 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !completing) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-prompt-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-white/15 relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={completing}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-md shadow-sky-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 id="task-prompt-title" className="text-base font-bold text-white leading-tight">
              {t('taskDetails')}
            </h2>
          </div>
        </div>

        {/* Task Info Card */}
        <div className="space-y-3 mb-5">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${
                priorityColors[task.priority]
              }`}
            >
              {priorityLabels[task.priority]}
            </span>

            {/* Recurrence */}
            {task.recurrence_rule && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 text-[11px] font-semibold">
                <Repeat className="w-3 h-3" />
                {task.recurrence_rule.includes('DAILY')
                  ? t('daily')
                  : task.recurrence_rule.includes('WEEKLY')
                  ? t('weekly')
                  : task.recurrence_rule.includes('MONTHLY')
                  ? t('monthly')
                  : t('recurring')}
              </span>
            )}

            {/* Due Date & Time */}
            {formattedDue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15 text-[11px] font-semibold" dir="auto">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>{formattedDue}</span>
              </span>
            )}

            {/* Assignee */}
            {task.assignee_name && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15 text-[11px] font-semibold ms-auto">
                <Avatar url={task.assignee_avatar} name={task.assignee_name} size="xs" />
                <span>{task.assignee_name}</span>
              </span>
            )}
          </div>

          {/* Task Title */}
          <h3 className="text-lg sm:text-xl font-bold text-white leading-snug break-words">
            {task.title}
          </h3>

          {/* Checklist / Description */}
          {content && (
            <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-white/10 max-h-48 overflow-y-auto">
              {isChecklist ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                      {t('typeChecklist')}
                    </span>
                    {checklistStats && (
                      <span className="text-xs font-bold text-sky-300">
                        {checklistStats.done}/{checklistStats.total}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {content.checklist.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-xs text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleToggleChecklistItem(index)}
                      >
                        <button
                          type="button"
                          className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            item.status === 'done'
                              ? 'bg-sky-500 border-sky-400 text-white'
                              : 'border-white/30 hover:border-white/60 bg-transparent'
                          }`}
                        >
                          {item.status === 'done' && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                        <span
                          className={`break-words flex-1 leading-snug ${
                            item.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          <HyperlinkText text={item.description} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative group/desc">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line pe-7">
                    <HyperlinkText text={content.description} />
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    className="absolute top-0 end-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title={t('copyDescription')}
                  >
                    {copiedDescription ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Snooze Section */}
        <div className="mb-5 bg-slate-950/40 rounded-2xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('snooze')}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {snoozeOptions.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => onSnooze(task, opt.minutes)}
                className="py-1.5 px-1 text-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:border-amber-400/60 text-xs font-bold transition-all active:scale-95 shadow-xs truncate"
                title={`${t('snooze')} ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action: Complete */}
        <button
          type="button"
          disabled={completing}
          onClick={() => onComplete(task)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-50 mb-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{completing ? t('saving') : t('markDone')}</span>
        </button>

        {/* Secondary Actions: Edit & Cancel */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => onEdit?.(task)}
            className="px-3 py-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{t('edit')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
