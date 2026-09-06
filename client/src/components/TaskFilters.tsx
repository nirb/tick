import React from 'react';
import type { User, TaskWithAssignee } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2 } from 'lucide-react';
import { Avatar } from './Avatar';

export type FilterTab = 'all' | 'completed' | 'mine' | 'due_soon';

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
  const { t } = useLanguage();

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const tabFilteredTasks = tasks.filter((task) => {
    if (currentTab === 'completed') return task.status === 'completed';
    return task.status !== 'completed';
  });

  const unassignedCount = tabFilteredTasks.filter((t) => !t.assignee_id).length;

  return (
    <div className="flex items-center gap-1.5 p-3 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/12 overflow-x-auto no-scrollbar text-xs shadow-md shadow-black/15 mb-6">
      <span className="text-slate-400 font-bold shrink-0 px-2">{t('filterBy')}</span>

      {/* Everyone */}
      <button
        onClick={() => {
          onTabChange('all');
          onAssigneeChange('');
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all shrink-0 font-bold ${selectedAssignee === '' && currentTab === 'all'
          ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/25'
          : 'bg-slate-800/80 text-slate-200 border-white/10 hover:bg-white/10'
          }`}
      >
        <span>{t('everyone')}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${selectedAssignee === '' && currentTab === 'all'
            ? 'bg-white/25 text-white'
            : 'bg-white/10 text-slate-300'
            }`}
        >
          {tabFilteredTasks.length}
        </span>
      </button>

      {/* Members */}
      {members.map((member) => {
        const isSelected = selectedAssignee === member.id;
        const memberCount = tabFilteredTasks.filter((t) => t.assignee_id === member.id).length;
        return (
          <button
            key={member.id}
            onClick={() => onAssigneeChange(isSelected ? '' : member.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all shrink-0 font-bold ${isSelected
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/25'
              : 'bg-slate-800/80 text-slate-200 border-white/10 hover:bg-white/10'
              }`}
          >
            <Avatar url={member.avatar_url} name={member.name} size="xs" />
            <span>{member.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${isSelected ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
                }`}
            >
              {memberCount}
            </span>
          </button>
        );
      })}

      {/* Unassigned */}
      {unassignedCount > 0 && (
        <button
          onClick={() => onAssigneeChange(selectedAssignee === 'unassigned' ? '' : 'unassigned')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shrink-0 font-bold ${selectedAssignee === 'unassigned'
            ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/25'
            : 'bg-slate-800/80 text-slate-200 border-white/10 hover:bg-white/10'
            }`}
        >
          <span>{t('unassigned')}</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${selectedAssignee === 'unassigned'
              ? 'bg-white/25 text-white'
              : 'bg-white/10 text-slate-300'
              }`}
          >
            {unassignedCount}
          </span>
        </button>
      )}

      {/* Separator */}
      <div className="h-4 w-px bg-white/15 shrink-0 mx-0.5" />

      {/* Completed Filter */}
      <button
        onClick={() => onTabChange(currentTab === 'completed' ? 'all' : 'completed')}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shrink-0 font-bold ${currentTab === 'completed'
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-sm shadow-emerald-500/25'
          : 'bg-slate-800/80 text-slate-200 border-white/10 hover:bg-white/10'
          }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{t('completed')}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${currentTab === 'completed' ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
            }`}
        >
          {completedCount}
        </span>
      </button>
    </div>
  );
};
