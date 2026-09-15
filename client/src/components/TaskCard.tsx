import React, { useState } from 'react';
import type { TaskWithAssignee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Check,
  Clock,
  Repeat,
  BellRing,
  Trash2,
  Edit2,
  Calendar,
  ChevronDown,
  CheckSquare,
  Copy,
  Users,
} from 'lucide-react';
import { parseTaskContent, serializeTaskContent, getChecklistStats } from '../lib/taskContent';
import { Avatar } from './Avatar';
import { HyperlinkText } from './HyperlinkText';

interface TaskCardProps {
  task: TaskWithAssignee;
  onToggleStatus: (task: TaskWithAssignee) => void;
  onNudge: (taskId: string) => Promise<void>;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (taskId: string) => void;
  onUpdateDescription?: (taskId: string, description: string | null) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onNudge,
  onEdit,
  onDelete,
  onUpdateDescription,
  onShowToast,
}) => {
  const { user, isAllGroups } = useAuth();
  const { t, language } = useLanguage();
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  const content = parseTaskContent(task.description);

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
      onShowToast?.(t('toastDescriptionCopied'), 'success');
      setTimeout(() => setCopiedDescription(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };
  const hasContent =
    content !== null &&
    ((content.type === 'description' && content.description.length > 0) ||
      (content.type === 'checklist' && content.checklist.length > 0));
  const isChecklist = content?.type === 'checklist';
  const checklistStats = isChecklist ? getChecklistStats(content.checklist) : null;

  const isCompleted = task.status === 'completed';
  const isAssignedToMe = user && task.assignee_id === user.id;
  const isAssignedToOther = user && task.assignee_id && task.assignee_id !== user.id;

  // Format Due Date
  const formatDue = (epoch: number | null) => {
    if (!epoch) return null;
    const date = new Date(epoch * 1000);
    const now = new Date();
    const isOverdue = epoch < Math.floor(Date.now() / 1000) && !isCompleted;

    const dateStr = date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });

    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((targetDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

    let relativeStr = '';
    if (diffDays === 0) {
      relativeStr = t('today');
    } else if (diffDays === 1) {
      relativeStr = t('inOneDay');
    } else if (diffDays === 2) {
      relativeStr = t('inTwoDays');
    } else if (diffDays > 2) {
      relativeStr = t('inDays', { days: diffDays });
    } else if (diffDays === -1) {
      relativeStr = t('oneDayAgo');
    } else if (diffDays === -2) {
      relativeStr = t('twoDaysAgo');
    } else {
      relativeStr = t('daysAgo', { days: Math.abs(diffDays) });
    }

    return {
      relativeText: relativeStr,
      fullText: `${dateStr} · ${relativeStr}`,
      isOverdue,
    };
  };

  const dueInfo = formatDue(task.due_at);

  const priorityColors = {
    low: 'bg-white/15 text-white border-white/35 font-semibold',
    medium: 'bg-blue-500/20 text-blue-200 border-blue-400/40 font-semibold',
    high: 'bg-orange-500/20 text-orange-200 border-orange-400/40 font-semibold',
    urgent: 'bg-red-500/25 text-red-200 border-red-400/40 font-bold shadow-sm shadow-red-500/20',
  };

  const priorityBorderClasses = {
    low: 'border-s-4 border-s-white/80 hover:border-s-white',
    medium: 'border-s-4 border-s-blue-400 hover:border-s-blue-300',
    high: 'border-s-4 border-s-orange-400 hover:border-s-orange-300',
    urgent: 'border-s-4 border-s-red-500 hover:border-s-red-400',
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

  const handleToggleChecklistItem = (index: number) => {
    if (!content || content.type !== 'checklist') return;
    const updatedItems = content.checklist.map((item, idx) =>
      idx === index
        ? {
          ...item,
          status: (item.status === 'done' ? 'not done' : 'done') as 'done' | 'not done',
        }
        : item
    );
    const serialized = serializeTaskContent({
      type: 'checklist',
      checklist: updatedItems,
    });
    if (onUpdateDescription) {
      onUpdateDescription(task.id, serialized);
    }
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer p-3.5 sm:p-4 z-0 ${priorityBorderClasses[task.priority] || priorityBorderClasses.medium} ${isCompleted
        ? 'border-white/5 bg-slate-900/40 opacity-60'
        : 'bg-slate-900/65 backdrop-blur-md border-white/12 hover:border-white/25 hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40'
        }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox - only shown when task card is open */}
        {isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(task);
            }}
            className={`w-6 h-6 mt-0.5 rounded-lg flex items-center justify-center border transition-all shrink-0 animate-in fade-in duration-200 ${isCompleted
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-md shadow-emerald-500/30'
              : 'border-white hover:border-emerald-400 hover:bg-emerald-500/20 bg-slate-950/60 text-transparent'
              }`}
            aria-label={isCompleted ? t('markIncomplete') : t('markDone')}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 grid grid-cols-10 items-center gap-2">
              {/* Task name: 50% in all groups (or 70% in single group) */}
              <div className={`${isAllGroups && task.group_name ? 'col-span-5' : 'col-span-7'} flex items-center min-w-0`}>
                <h3
                  className={`text-sm sm:text-base font-bold leading-snug break-words tracking-tight text-start select-none min-w-0 flex-1 ${isCompleted ? 'line-through text-slate-400' : 'text-white'
                    }`}
                >
                  {task.title}
                </h3>
              </div>

              {/* Middle: Priority badge when open, "in x days" when closed (30%) */}
              <div className="col-span-3 min-w-0 flex items-center justify-center">
                {isExpanded ? (
                  <span
                    className={`inline-flex items-center justify-center w-full px-2 py-0.5 rounded-full border text-xs capitalize font-semibold min-w-0 ${priorityColors[task.priority] || priorityColors.medium
                      }`}
                  >
                    <span className="truncate">{t(task.priority)}</span>
                  </span>
                ) : (
                  dueInfo && (
                    <span
                      className={`inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-[11px] sm:text-xs font-semibold w-full min-w-0 ${dueInfo.isOverdue
                        ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                        : 'bg-white/10 text-slate-200 border-white/15'
                        }`}
                      title={dueInfo.relativeText}
                    >
                      <span className="truncate">{dueInfo.relativeText}</span>
                    </span>
                  )
                )}
              </div>

              {/* Group Name: 20% */}
              {isAllGroups && task.group_name && (
                <div className="col-span-2 min-w-0 flex items-center justify-center">
                  <span
                    className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/15 max-w-full min-w-0"
                    title={task.group_name}
                  >
                    <span className="truncate">{task.group_name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Expand / Collapse Arrow at the end of the row */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-400' : ''
                }`}
            />
          </div>

          {/* Expanded Section: Description/Checklist + Second Line Badges */}
          {isExpanded && (
            <div
              className="mt-2.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {hasContent && (
                content?.type === 'checklist' ? (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                    <div className="space-y-1.5">
                      {content.checklist.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="flex items-center gap-2.5 text-xs sm:text-sm group/item select-none"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChecklistItem(index);
                            }}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${item.status === 'done'
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs'
                              : 'border-white/30 hover:border-sky-400 bg-slate-900 text-transparent'
                              }`}
                            aria-label={item.status === 'done' ? 'Mark item incomplete' : 'Mark item complete'}
                          >
                            {item.status === 'done' && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChecklistItem(index);
                            }}
                            className={`cursor-pointer break-words flex-1 transition-colors leading-tight ${item.status === 'done'
                              ? 'line-through text-slate-500'
                              : isCompleted
                                ? 'text-slate-400 line-through'
                                : 'text-slate-200 hover:text-white'
                              }`}
                          >
                            <HyperlinkText
                              text={item.description}
                              linkClassName={
                                item.status === 'done' || isCompleted
                                  ? 'text-sky-400/70 hover:text-sky-300'
                                  : undefined
                              }
                            />
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar inside expanded view */}
                    {checklistStats && checklistStats.total > 0 && (
                      <div className="pt-2 mt-1 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(checklistStats.done / checklistStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-300">
                          {checklistStats.done}/{checklistStats.total}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative group/desc">
                    <p
                      className={`text-xs sm:text-sm p-2.5 pe-8 rounded-xl bg-slate-950/50 border border-white/8 leading-relaxed whitespace-pre-line ${isCompleted ? 'text-slate-500' : 'text-slate-200 font-normal'
                        }`}
                    >
                      <HyperlinkText
                        text={content?.description}
                        linkClassName={isCompleted ? 'text-sky-400/70 hover:text-sky-300' : undefined}
                      />
                    </p>
                    <div className="absolute top-1.5 end-1.5 flex items-center">
                      {copiedDescription && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="absolute -top-7.5 end-0 px-2 py-0.5 rounded-lg bg-slate-900/95 border border-emerald-400/40 text-[11px] font-medium text-emerald-300 shadow-xl shadow-black/60 flex items-center gap-1 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none z-20"
                        >
                          <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span>{t('descriptionCopied')}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyDescription}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                        title={copiedDescription ? t('descriptionCopied') : t('copyDescription')}
                        aria-label={copiedDescription ? t('descriptionCopied') : t('copyDescription')}
                      >
                        {copiedDescription ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Second Line: Badges and Assignee */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {/* Action Buttons (Edit / Delete) */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/30 transition-all font-medium active:scale-95 cursor-pointer text-xs"
                    title={t('edit')}
                    aria-label={t('edit')}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{t('edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/30 transition-all font-medium active:scale-95 cursor-pointer text-xs"
                    title={t('delete')}
                    aria-label={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{t('delete')}</span>
                  </button>
                </div>

                {/* Checklist Progress Badge */}
                {checklistStats && checklistStats.total > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${checklistStats.allDone
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40 shadow-xs shadow-emerald-500/20'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                      }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>
                      {checklistStats.done}/{checklistStats.total}
                    </span>
                  </span>
                )}

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

                {/* Group Badge */}
                {isAllGroups && task.group_name && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 font-semibold text-xs">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>{task.group_name}</span>
                  </span>
                )}

                {/* Due Date */}
                {dueInfo && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-semibold ${dueInfo.isOverdue
                      ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                      : 'bg-white/10 text-slate-200 border-white/15'
                      }`}
                  >
                    {dueInfo.isOverdue ? (
                      <Clock className="w-3 h-3 text-rose-300" />
                    ) : (
                      <Calendar className="w-3 h-3 text-sky-400" />
                    )}
                    {dueInfo.fullText}
                  </span>
                )}

                {/* Assignee Chip */}
                <div className="ms-auto flex items-center gap-2">
                  {task.assignee_name ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isAssignedToMe
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                        : 'bg-white/10 text-slate-200 border-white/15'
                        }`}
                    >
                      <Avatar url={task.assignee_avatar} name={task.assignee_name} size="xs" />
                      <span>{isAssignedToMe ? t('you') : task.assignee_name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic font-medium">{t('unassigned')}</span>
                  )}

                  {/* Nudge Assignee Button (FR-PUSH-2) */}
                  {!isCompleted && isAssignedToOther && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNudge();
                      }}
                      disabled={nudging || nudged}
                      title={`Send a push reminder to ${task.assignee_name}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${nudged
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
          )}
        </div>
      </div>
    </div>
  );
};
