import React, { useState, useEffect } from 'react';
import type { TaskWithAssignee, TaskPriority, User } from '../types';
import { X, Calendar, User as UserIcon, AlertTriangle, Repeat } from 'lucide-react';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDateTime, setDueDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setAssigneeId(taskToEdit.assignee_id || '');
      setPriority(taskToEdit.priority);
      if (taskToEdit.due_at) {
        const d = new Date(taskToEdit.due_at * 1000);
        // Format YYYY-MM-DDTHH:mm
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
      setDescription('');
      setAssigneeId('');
      setPriority('medium');
      setDueDateTime('');
      setRecurrence('none');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

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

      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
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
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    { value: 'urgent', label: 'Urgent', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-4">
          {taskToEdit ? 'Edit Chore / Task' : 'New Family Task'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Empty dishwasher, Take out trash, Math homework"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any details or specific instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Assignee Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> Assign To
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAssigneeId('')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs transition-colors ${
                  assigneeId === ''
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base">👤</span>
                <span className="truncate">Anyone</span>
              </button>

              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setAssigneeId(member.id)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs transition-colors ${
                    assigneeId === member.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`py-2 px-1 rounded-xl text-xs text-center border transition-all ${
                    priority === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-slate-400 border-transparent shadow-sm`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDateTime}
                onChange={(e) => setDueDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-purple-600" /> Repeat
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Every Day</option>
                <option value="weekly">Every Week</option>
                <option value="monthly">Every Month</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all"
            >
              {submitting ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
