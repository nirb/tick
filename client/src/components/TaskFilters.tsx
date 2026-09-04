import React from 'react';
import type { User, TaskWithAssignee } from '../types';
import { useAuth } from '../context/AuthContext';
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

  const now = Math.floor(Date.now() / 1000);
  const counts = {
    all: tasks.filter((t) => t.status !== 'completed').length,
    mine: user ? tasks.filter((t) => t.assignee_id === user.id && t.status !== 'completed').length : 0,
    due_soon: tasks.filter(
      (t) => t.status !== 'completed' && t.due_at && t.due_at <= now + 86400 * 2 // due in next 48h
    ).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const tabs: { id: FilterTab; label: string; icon: any; count: number }[] = [
    { id: 'all', label: 'All Open', icon: ListTodo, count: counts.all },
    { id: 'mine', label: 'Mine', icon: UserCheck, count: counts.mine },
    { id: 'due_soon', label: 'Due Soon', icon: Clock, count: counts.due_soon },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed },
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* Primary Status Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/60 text-slate-700'
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
        <span className="text-slate-400 font-medium shrink-0 ml-1">Filter by:</span>

        <button
          onClick={() => onAssigneeChange('')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 font-medium ${
            selectedAssignee === ''
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Everyone
        </button>

        {members.map((member) => {
          const isSelected = selectedAssignee === member.id;
          return (
            <button
              key={member.id}
              onClick={() => onAssigneeChange(isSelected ? '' : member.id)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border transition-all shrink-0 font-medium ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
