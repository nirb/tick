import React, { useState, useEffect } from 'react';
import type { TaskWithAssignee, TaskPriority, User, ChecklistItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Repeat,
  AlignLeft,
  ListChecks,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { parseTaskContent, serializeTaskContent, generateItemId } from '../lib/taskContent';

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
  }) => Promise<void>;
  members: User[];
  taskToEdit?: TaskWithAssignee | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  taskToEdit,
}) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'description' | 'checklist'>('description');
  const [descriptionText, setDescriptionText] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDateTime, setDueDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
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
      setAssigneeId(taskToEdit.assignee_id || '');
      setPriority(taskToEdit.priority);
      if (taskToEdit.due_at) {
        const d = new Date(taskToEdit.due_at * 1000);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setDueDateTime(localISOTime);
      } else {
        setDueDateTime('');
      }

      if (taskToEdit.recurrence_rule?.includes('DAILY')) setRecurrence('daily');
      else if (taskToEdit.recurrence_rule?.includes('WEEKLY')) setRecurrence('weekly');
      else if (taskToEdit.recurrence_rule?.includes('MONTHLY')) setRecurrence('monthly');
      else setRecurrence('none');
    } else {
      setTitle('');
      setContentType('description');
      setDescriptionText('');
      setChecklistItems([]);
      setNewChecklistInput('');
      setAssigneeId('');
      setPriority('medium');
      setDueDateTime('');
      setRecurrence('none');
    }
  }, [taskToEdit, isOpen]);

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
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status === 'done' ? 'not done' : 'done' } : item
      )
    );
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      let dueAt: number | null = null;
      if (dueDateTime) {
        dueAt = Math.floor(new Date(dueDateTime).getTime() / 1000);
      }

      let recurrenceRule: string | null = null;
      if (recurrence === 'daily') recurrenceRule = 'FREQ=DAILY';
      else if (recurrence === 'weekly') recurrenceRule = 'FREQ=WEEKLY';
      else if (recurrence === 'monthly') recurrenceRule = 'FREQ=MONTHLY';

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

      await onSubmit({
        title: title.trim(),
        description: serializedDescription,
        assignee_id: assigneeId || null,
        priority,
        due_at: dueAt,
        recurrence_rule: recurrenceRule,
      });

      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: t('low'), color: 'bg-slate-500/20 text-slate-200 border-slate-400/40 font-semibold' },
    { value: 'medium', label: t('medium'), color: 'bg-sky-500/20 text-sky-200 border-sky-400/40 font-semibold' },
    { value: 'high', label: t('high'), color: 'bg-amber-500/20 text-amber-200 border-amber-400/40 font-semibold' },
    { value: 'urgent', label: t('urgent'), color: 'bg-rose-500/25 text-rose-200 border-rose-400/40 font-bold' },
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
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
              {t('taskTitle')}
            </label>
            <input
              type="text"
              required
              placeholder={t('taskTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-sm font-medium transition-all"
            />
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

          {/* Assignee Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-sky-400" /> {t('assignTo')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAssigneeId('')}
                className={`p-2 rounded-xl border text-start flex items-center gap-2 text-xs transition-colors ${
                  assigneeId === ''
                    ? 'border-sky-400/60 bg-sky-500/25 text-sky-100 font-bold shadow-sm shadow-sky-500/20'
                    : 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-medium'
                }`}
              >
                <span className="text-base">👤</span>
                <span className="truncate">{t('anyone')}</span>
              </button>

              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setAssigneeId(member.id)}
                  className={`p-2 rounded-xl border text-start flex items-center gap-2 text-xs transition-colors ${
                    assigneeId === member.id
                      ? 'border-sky-400/60 bg-sky-500/25 text-sky-100 font-bold shadow-sm shadow-sky-500/20'
                      : 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-medium'
                  }`}
                >
                  <span className="text-base">{member.avatar_url || '👤'}</span>
                  <span className="truncate">{member.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {t('priority')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`py-2 px-1 rounded-xl text-xs text-center border transition-all font-bold ${
                    priority === opt.value
                      ? `${opt.color} ring-2 ring-sky-400 border-sky-400/70 shadow-sm shadow-sky-500/20`
                      : `${opt.color} opacity-70 hover:opacity-100`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Recurrence Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> {t('dueDateTime')}
              </label>
              <input
                type="datetime-local"
                value={dueDateTime}
                onChange={(e) => setDueDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-400" /> {t('repeat')}
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/20 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-xs font-medium"
              >
                <option value="none">{t('doesNotRepeat')}</option>
                <option value="daily">{t('daily')}</option>
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
              </select>
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
      </div>
    </div>
  );
};
