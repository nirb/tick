import React, { useState, useEffect, useMemo } from 'react';
import type { TaskWithAssignee, TaskPriority, User, ChecklistItem, GroupMembership } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  AlertTriangle,
  Repeat,
  AlignLeft,
  ListChecks,
  Plus,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { parseTaskContent, serializeTaskContent, generateItemId } from '../lib/taskContent';
import { CalendarPickerModal } from './CalendarPickerModal';
import { ClockPickerModal } from './ClockPickerModal';
import { api } from '../lib/api';
import { cacheMembers, getCachedMembers } from '../lib/offline';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    assignee_id?: string | null;
    priority: TaskPriority;
    due_at?: number | null;
    recurrence_rule?: string | null;
    group_id?: string;
  }) => Promise<void>;
  members: User[];
  groups?: GroupMembership[];
  currentGroupId?: string;
  taskToEdit?: TaskWithAssignee | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  groups,
  currentGroupId,
  taskToEdit,
}) => {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'description' | 'checklist'>('description');
  const [descriptionText, setDescriptionText] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDateTime, setDueDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [selectedTaskGroupId, setSelectedTaskGroupId] = useState<string>('');
  const [modalMembers, setModalMembers] = useState<User[]>(members);
  const [submitting, setSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isClockOpen, setIsClockOpen] = useState(false);

  const currentDate = dueDateTime ? dueDateTime.split('T')[0] : '';
  const currentTime = dueDateTime && dueDateTime.includes('T') ? dueDateTime.split('T')[1].slice(0, 5) : '';

  const formattedDisplayDate = useMemo(() => {
    if (!currentDate) return '';
    try {
      const parts = currentDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      return dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return currentDate;
    }
  }, [currentDate, language]);

  const getNextDay9AMString = () => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const d = String(nextDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T09:00`;
  };

  const handleRecurrenceChange = (newRecurrence: 'none' | 'daily' | 'weekly' | 'monthly') => {
    setRecurrence(newRecurrence);
    if (newRecurrence !== 'none') {
      if (!dueDateTime) {
        setDueDateTime(getNextDay9AMString());
      } else {
        const parts = dueDateTime.split('T');
        const hasDate = Boolean(parts[0]);
        const hasTime = Boolean(parts[1]) && parts[1] !== '00:00';
        if (!hasDate && !hasTime) {
          setDueDateTime(getNextDay9AMString());
        } else if (!hasDate) {
          const nextDay = new Date();
          nextDay.setDate(nextDay.getDate() + 1);
          const y = nextDay.getFullYear();
          const m = String(nextDay.getMonth() + 1).padStart(2, '0');
          const d = String(nextDay.getDate()).padStart(2, '0');
          setDueDateTime(`${y}-${m}-${d}T${parts[1] || '09:00'}`);
        } else if (!hasTime) {
          setDueDateTime(`${parts[0]}T09:00`);
        }
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      if (recurrence !== 'none') {
        setDueDateTime(getNextDay9AMString());
      } else {
        setDueDateTime('');
      }
      return;
    }
    const defaultTime = recurrence !== 'none' ? '09:00' : '10:00';
    const time = currentTime || defaultTime;
    setDueDateTime(`${newDate}T${time}`);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) {
      if (recurrence !== 'none') {
        const date = currentDate || getNextDay9AMString().split('T')[0];
        setDueDateTime(`${date}T09:00`);
      } else if (currentDate) {
        setDueDateTime(`${currentDate}T00:00`);
      } else {
        setDueDateTime('');
      }
      return;
    }
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const date = currentDate || `${y}-${m}-${d}`;
    setDueDateTime(`${date}T${newTime}`);
  };

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setSelectedTaskGroupId(taskToEdit.group_id);
      const parsed = parseTaskContent(taskToEdit.description);
      if (parsed?.type === 'checklist') {
        setContentType('checklist');
        setChecklistItems(parsed.checklist);
        setDescriptionText('');
      } else if (parsed?.type === 'description') {
        setContentType('description');
        setDescriptionText(parsed.description);
        setChecklistItems([]);
      } else {
        setContentType('description');
        setDescriptionText('');
        setChecklistItems([]);
      }
      setNewChecklistInput('');
      setAssigneeId(taskToEdit.assignee_id || (members && members.length === 1 ? members[0].id : ''));
      setPriority(taskToEdit.priority);
      if (taskToEdit.due_at) {
        const d = new Date(taskToEdit.due_at * 1000);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setDueDateTime(localISOTime);
      } else if (taskToEdit.recurrence_rule) {
        setDueDateTime(getNextDay9AMString());
      } else {
        setDueDateTime('');
      }

      if (taskToEdit.recurrence_rule?.includes('DAILY')) setRecurrence('daily');
      else if (taskToEdit.recurrence_rule?.includes('WEEKLY')) setRecurrence('weekly');
      else if (taskToEdit.recurrence_rule?.includes('MONTHLY')) setRecurrence('monthly');
      else setRecurrence('none');
    } else {
      setTitle('');
      setSelectedTaskGroupId(
        currentGroupId && currentGroupId !== 'ALL_GROUPS'
          ? currentGroupId
          : groups && groups.length > 0
          ? groups[0].group_id
          : ''
      );
      setContentType('description');
      setDescriptionText('');
      setChecklistItems([]);
      setNewChecklistInput('');
      setAssigneeId(members && members.length === 1 ? members[0].id : '');
      setPriority('medium');
      setDueDateTime('');
      setRecurrence('none');
    }
  }, [taskToEdit, isOpen, currentGroupId, groups, members]);

  useEffect(() => {
    if (!isOpen) return;
    const targetGroupId = selectedTaskGroupId || taskToEdit?.group_id || (currentGroupId && currentGroupId !== 'ALL_GROUPS' ? currentGroupId : undefined);
    if (targetGroupId && targetGroupId !== currentGroupId && targetGroupId !== 'ALL_GROUPS') {
      let isMounted = true;
      (async () => {
        try {
          const cached = await getCachedMembers(targetGroupId);
          if (cached && cached.length > 0 && isMounted) {
            setModalMembers(cached);
          }
          const res = await api.groups.getMembers(targetGroupId);
          if (res.members && isMounted) {
            setModalMembers(res.members);
            await cacheMembers(res.members, targetGroupId);
          }
        } catch (err) {
          console.warn('Could not fetch members for selected group in modal:', err);
        }
      })();
      return () => {
        isMounted = false;
      };
    } else {
      setModalMembers(members);
    }
  }, [selectedTaskGroupId, taskToEdit?.group_id, currentGroupId, members, isOpen]);

  useEffect(() => {
    if (modalMembers && modalMembers.length === 1) {
      setAssigneeId(modalMembers[0].id);
    }
  }, [modalMembers]);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistInput.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      {
        id: generateItemId(),
        status: 'not done',
        description: newChecklistInput.trim(),
      },
    ]);
    setNewChecklistInput('');
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: text } : item))
    );
  };

  const handleToggleChecklistItemStatus = (id: string) => {
    setChecklistItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target) return prev;
      const nextStatus = target.status === 'done' ? 'not done' : 'done';
      const updatedItem = { ...target, status: nextStatus as 'done' | 'not done' };
      if (nextStatus === 'done') {
        return [...prev.filter((item) => item.id !== id), updatedItem];
      }
      return prev.map((item) => (item.id === id ? updatedItem : item));
    });
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      let recurrenceRule: string | null = null;
      if (recurrence === 'daily') recurrenceRule = 'FREQ=DAILY';
      else if (recurrence === 'weekly') recurrenceRule = 'FREQ=WEEKLY';
      else if (recurrence === 'monthly') recurrenceRule = 'FREQ=MONTHLY';

      let dueAt: number | null = null;
      let finalDueDateTime = dueDateTime;
      if (recurrenceRule) {
        if (!finalDueDateTime) {
          finalDueDateTime = getNextDay9AMString();
        } else {
          const parts = finalDueDateTime.split('T');
          const hasDate = Boolean(parts[0]);
          const hasTime = Boolean(parts[1]) && parts[1] !== '00:00';
          if (!hasDate && !hasTime) {
            finalDueDateTime = getNextDay9AMString();
          } else if (!hasDate) {
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            const y = nextDay.getFullYear();
            const m = String(nextDay.getMonth() + 1).padStart(2, '0');
            const d = String(nextDay.getDate()).padStart(2, '0');
            finalDueDateTime = `${y}-${m}-${d}T${parts[1] || '09:00'}`;
          } else if (!hasTime) {
            finalDueDateTime = `${parts[0]}T09:00`;
          }
        }
      }

      if (finalDueDateTime) {
        dueAt = Math.floor(new Date(finalDueDateTime).getTime() / 1000);
      }

      let serializedDescription: string | undefined = undefined;
      if (contentType === 'checklist') {
        const items = [...checklistItems];
        if (newChecklistInput.trim()) {
          items.push({
            id: generateItemId(),
            status: 'not done',
            description: newChecklistInput.trim(),
          });
        }
        const cleanItems = items.filter((i) => i.description.trim().length > 0);
        if (cleanItems.length > 0) {
          serializedDescription =
            serializeTaskContent({
              type: 'checklist',
              checklist: cleanItems,
            }) || undefined;
        }
      } else {
        if (descriptionText.trim()) {
          serializedDescription =
            serializeTaskContent({
              type: 'description',
              description: descriptionText.trim(),
            }) || undefined;
        }
      }

      let finalAssigneeId = assigneeId;
      const effectiveMembers = modalMembers && modalMembers.length > 0 ? modalMembers : members;
      if (!finalAssigneeId && effectiveMembers && effectiveMembers.length === 1) {
        finalAssigneeId = effectiveMembers[0].id;
      }

      await onSubmit({
        title: title.trim(),
        description: serializedDescription,
        assignee_id: finalAssigneeId || null,
        priority,
        due_at: dueAt,
        recurrence_rule: recurrenceRule,
        group_id: selectedTaskGroupId || undefined,
      });

      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const priorityOptions: { value: TaskPriority; label: string; icon: string }[] = [
    { value: 'low', label: t('low'), icon: '⚪' },
    { value: 'medium', label: t('medium'), icon: '🔵' },
    { value: 'high', label: t('high'), icon: '🟠' },
    { value: 'urgent', label: t('urgent'), icon: '🔴' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/15 relative max-h-[90vh] overflow-y-auto text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold gradient-text mb-4">
          {taskToEdit ? t('editTask') : t('newTask')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Group (4/12) & Task Title (8/12) */}
          <div className="grid grid-cols-12 gap-3">
            {groups && groups.length > 1 ? (
              <>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 truncate">
                    {t('groupLabel')}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTaskGroupId}
                      onChange={(e) => setSelectedTaskGroupId(e.target.value)}
                      className="w-full h-10 px-3 pe-8 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all appearance-none cursor-pointer"
                    >
                      {groups.map((g) => (
                        <option key={g.group_id} value={g.group_id} className="bg-slate-900 text-white">
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-8">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 truncate">
                    {t('taskTitle')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('taskTitlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-12">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 truncate">
                  {t('taskTitle')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('taskTitlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all"
                />
              </div>
            )}
          </div>

          {/* Task Content: Toggle between Description / Notes & Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                {contentType === 'checklist' ? t('typeChecklist') : t('descriptionNotes')}
              </label>

              {/* Segmented Type Switcher */}
              <div className="inline-flex p-0.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setContentType('description')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                    contentType === 'description'
                      ? 'bg-sky-500/25 text-sky-200 font-bold shadow-sm shadow-sky-500/20 border border-sky-400/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>{t('typeNotes')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('checklist')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                    contentType === 'checklist'
                      ? 'bg-sky-500/25 text-sky-200 font-bold shadow-sm shadow-sky-500/20 border border-sky-400/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>{t('typeChecklist')}</span>
                  {checklistItems.length > 0 && (
                    <span className="ms-1 px-1.5 py-0.2 rounded-full bg-sky-400/20 text-sky-300 text-[10px] font-bold">
                      {checklistItems.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {contentType === 'description' ? (
              <textarea
                rows={2}
                placeholder={t('descriptionPlaceholder')}
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-sm transition-all font-normal"
              />
            ) : (
              <div className="space-y-2">
                {/* Checklist Items */}
                {checklistItems.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-white/10 group/item hover:border-white/20 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItemStatus(item.id)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                            item.status === 'done'
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/20'
                              : 'border-white/30 hover:border-sky-400 bg-slate-900 text-transparent'
                          }`}
                          aria-label={item.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {item.status === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                          className={`flex-1 bg-transparent text-xs sm:text-sm text-white focus:outline-none font-medium ${
                            item.status === 'done' ? 'line-through text-slate-400' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/15 shrink-0"
                          title={t('deleteItem')}
                          aria-label={t('deleteItem')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item Row */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('checklistItemPlaceholder')}
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    disabled={!newChecklistInput.trim()}
                    className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 text-xs font-bold transition-all disabled:opacity-40 disabled:hover:bg-sky-500/20 flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addChecklistItem')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Assign To (6/12) & Priority (6/12) */}
          {modalMembers && modalMembers.length > 1 ? (
            <div className="grid grid-cols-12 gap-3">
              {/* Assignee Selection (6/12) */}
              <div className="col-span-6">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                  <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{t('assignTo')}</span>
                </label>
                <div className="relative">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full h-10 px-3 pe-8 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-white">
                      👤 {t('anyone')}
                    </option>
                    {modalMembers.map((member) => (
                      <option key={member.id} value={member.id} className="bg-slate-900 text-white">
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Priority Dropdown (6/12) */}
              <div className="col-span-6">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{t('priority')}</span>
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-10 px-3 pe-8 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all appearance-none cursor-pointer"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              {/* Priority only (6/12) when 1 member in private group */}
              <div className="col-span-6">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{t('priority')}</span>
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-10 px-3 pe-8 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm font-medium transition-all appearance-none cursor-pointer"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Row 3: Due Date (4/12), Due Time (4/12), Repeat (4/12) */}
          <div className="grid grid-cols-12 gap-3">
            {/* Date Button (4/12) */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{t('dueDate')}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className={`w-full h-10 px-2.5 sm:px-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                  currentDate
                    ? 'bg-slate-950/80 border-sky-500/50 text-white shadow-sm ring-1 ring-sky-500/30'
                    : 'bg-slate-950/70 border-white/20 text-slate-400 hover:border-white/40 hover:text-slate-200'
                }`}
              >
                <span className="truncate">
                  {formattedDisplayDate || t('selectDate')}
                </span>
                {currentDate && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateChange('');
                    }}
                    className="p-1 -me-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                    title={t('clear')}
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>

            {/* Time Button (4/12) */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{t('dueTime')}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsClockOpen(true)}
                className={`w-full h-10 px-2.5 sm:px-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                  currentTime
                    ? 'bg-slate-950/80 border-indigo-500/50 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/70 border-white/20 text-slate-400 hover:border-white/40 hover:text-slate-200'
                }`}
              >
                <span className="truncate" dir={currentTime ? 'ltr' : undefined}>
                  {currentTime || t('selectTime')}
                </span>
                {currentTime && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeChange('');
                    }}
                    className="p-1 -me-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                    title={t('clear')}
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>

            {/* Repeat Dropdown (4/12) */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 truncate">
                <Repeat className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{t('repeat')}</span>
              </label>
              <div className="relative">
                <select
                  value={recurrence}
                  onChange={(e) => handleRecurrenceChange(e.target.value as any)}
                  className="w-full h-10 px-2.5 sm:px-3 pe-7 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs font-medium transition-all appearance-none cursor-pointer"
                >
                  <option value="none" className="bg-slate-900 text-white">
                    {t('doesNotRepeat')}
                  </option>
                  <option value="daily" className="bg-slate-900 text-white">
                    {t('daily')}
                  </option>
                  <option value="weekly" className="bg-slate-900 text-white">
                    {t('weekly')}
                  </option>
                  <option value="monthly" className="bg-slate-900 text-white">
                    {t('monthly')}
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-5 py-2.5 glow-btn disabled:opacity-50 text-white text-sm font-bold rounded-xl"
            >
              {submitting ? t('saving') : taskToEdit ? t('saveChanges') : t('createTask')}
            </button>
          </div>
        </form>

        <CalendarPickerModal
          isOpen={isCalendarOpen}
          value={currentDate}
          onChange={handleDateChange}
          onClose={() => setIsCalendarOpen(false)}
        />

        <ClockPickerModal
          isOpen={isClockOpen}
          value={currentTime}
          onChange={handleTimeChange}
          onClose={() => setIsClockOpen(false)}
        />
      </div>
    </div>
  );
};
