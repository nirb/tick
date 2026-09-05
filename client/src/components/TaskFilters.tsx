import React from 'react';
import type { User, TaskWithAssignee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Clock, CheckCircle2, ListTodo, UserCheck } from 'lucide-react';

export type FilterTab = 'all' | 'mine' | 'due_soon' | 'completed';

interface TaskFiltersProps {
  currentTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  selectedAssignee: string;
  onAssigneeChange: (assigneeId: string) => void;
  members: User[];
  tasks: TaskWithAssignee[];
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  currentTab,
  onTabChange,
  selectedAssignee,
  onAssigneeChange,
  members,
  tasks,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const now = Math.floor(Date.now() / 1000);
  const counts = {
    all: tasks.filter((t) => t.status !== 'completed').length,
    mine: user ? tasks.filter((t) => t.assignee_id === user.id && t.status !== 'completed').length : 0,
    due_soon: tasks.filter(
      (t) => t.status !== 'completed' && t.due_at && t.due_at <= now + 86400 * 2
    ).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const tabs: { id: FilterTab; label: string; icon: any; count: number }[] = [
    { id: 'all', label: t('allOpen'), icon: ListTodo, count: counts.all },
    { id: 'mine', label: t('mine'), icon: UserCheck, count: counts.mine },
    { id: 'due_soon', label: t('dueSoon'), icon: Clock, count: counts.due_soon },
    { id: 'completed', label: t('completed'), icon: CheckCircle2, count: counts.completed },
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* Primary Status Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-white/12 overflow-x-auto no-scrollbar shadow-lg shadow-black/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/30 to-indigo-500/30 text-sky-200 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`ms-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-sky-500/40 text-white border border-sky-400/40' : 'bg-white/10 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Member Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 font-bold shrink-0 ms-1">{t('filterBy')}</span>

        <button
          onClick={() => onAssigneeChange('')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 font-bold ${
            selectedAssignee === ''
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/25'
              : 'bg-slate-900/60 text-slate-200 border-white/15 hover:bg-white/10'
          }`}
        >
          {t('everyone')}
        </button>

        {members.map((member) => {
          const isSelected = selectedAssignee === member.id;
          return (
            <button
              key={member.id}
              onClick={() => onAssigneeChange(isSelected ? '' : member.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shrink-0 font-bold ${
                isSelected
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/25'
                  : 'bg-slate-900/60 text-slate-200 border-white/15 hover:bg-white/10'
              }`}
            >
              <span>{member.avatar_url || '👤'}</span>
              <span>{member.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
