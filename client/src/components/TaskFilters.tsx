import React from 'react';
import type { User, TaskWithAssignee } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Users, CheckCircle2, ChevronDown, Check, Filter, UserX } from 'lucide-react';
import { Avatar } from './Avatar';

export type FilterTab = 'all' | 'completed' | 'mine' | 'due_soon';

export interface TaskFiltersProps {
  currentTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  selectedAssignee: string;
  onAssigneeChange: (assigneeId: string) => void;
  members: User[];
  tasks: TaskWithAssignee[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  currentTab,
  onTabChange,
  selectedAssignee,
  onAssigneeChange,
  members,
  tasks,
  isOpen,
  onToggle,
  onClose,
}) => {
  const { t } = useLanguage();

  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const unassignedCount = openTasks.filter((t) => !t.assignee_id).length;

  const isEveryone = currentTab === 'all' && !selectedAssignee;
  const isCompleted = currentTab === 'completed';
  const isUnassigned = !isEveryone && !isCompleted && selectedAssignee === 'unassigned';
  const activeMember =
    !isEveryone && !isCompleted && !isUnassigned
      ? members.find((m) => m.id === selectedAssignee)
      : null;

  // Compute label and count for trigger button
  let triggerLabel = t('everyone');
  let triggerCount = openTasks.length;
  let triggerIcon = <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />;

  if (isCompleted) {
    triggerLabel = t('completed');
    triggerCount = completedTasks.length;
    triggerIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  } else if (activeMember) {
    triggerLabel = activeMember.name;
    triggerCount = openTasks.filter((t) => t.assignee_id === activeMember.id).length;
    triggerIcon = <Avatar url={activeMember.avatar_url} name={activeMember.name} size="xs" />;
  } else if (isUnassigned) {
    triggerLabel = t('unassigned');
    triggerCount = unassignedCount;
    triggerIcon = <UserX className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }

  const handleSelectEveryone = () => {
    onTabChange('all');
    onAssigneeChange('');
    onClose();
  };

  const handleSelectMember = (memberId: string) => {
    onTabChange('all');
    onAssigneeChange(memberId);
    onClose();
  };

  const handleSelectUnassigned = () => {
    onTabChange('all');
    onAssigneeChange('unassigned');
    onClose();
  };

  const handleSelectCompleted = () => {
    onTabChange('completed');
    onAssigneeChange('');
    onClose();
  };

  return (
    <div className="relative">
      {/* Trigger Button in Navbar (Shows only "Everyone" by default) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isOpen
            ? 'bg-sky-500/20 border-sky-400/50 text-white ring-2 ring-sky-400/30 shadow-md shadow-sky-500/10'
            : isCompleted
            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25'
            : activeMember || isUnassigned
            ? 'bg-sky-500/15 border-sky-400/40 text-sky-200 hover:bg-sky-500/25'
            : 'bg-white/5 border-white/12 text-slate-200 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {triggerIcon}
        <span className="truncate max-w-[70px] sm:max-w-[100px]">{triggerLabel}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${
            isOpen || activeMember || isUnassigned
              ? 'bg-sky-400/25 text-sky-200'
              : isCompleted
              ? 'bg-emerald-400/25 text-emerald-200'
              : 'bg-white/10 text-slate-300'
          }`}
        >
          {triggerCount}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Expanded Options Panel (Dropdown with smooth expand animation) */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 p-2.5 z-40 text-xs text-slate-100 animate-dropdown-expand">
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-white/10 mb-1.5 flex items-center justify-between text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('filterBy')}</span>
            </span>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold">
              {openTasks.length} {t('allOpen').toLowerCase()}
            </span>
          </div>

          {/* Option: Everyone */}
          <button
            type="button"
            onClick={handleSelectEveryone}
            className={`w-full text-start px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors ${
              isEveryone
                ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/25 text-white font-bold border border-sky-400/40 shadow-sm shadow-sky-500/10'
                : 'hover:bg-white/10 text-slate-200 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isEveryone
                    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">{t('everyone')}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${
                  isEveryone ? 'bg-sky-500/30 text-sky-200' : 'bg-white/10 text-slate-300'
                }`}
              >
                {openTasks.length}
              </span>
              {isEveryone ? (
                <Check className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <div className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {/* Members Category */}
          {members.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-white/10">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('members')}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 my-0.5 pe-0.5">
                {members.map((member) => {
                  const isSelected = !isCompleted && selectedAssignee === member.id;
                  const memberCount = openTasks.filter((t) => t.assignee_id === member.id).length;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectMember(member.id)}
                      className={`w-full text-start px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/25 text-white font-bold border border-sky-400/40 shadow-sm shadow-sky-500/10'
                          : 'hover:bg-white/10 text-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                        <Avatar url={member.avatar_url} name={member.name} size="xs" />
                        <span className="truncate">{member.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${
                            isSelected ? 'bg-sky-500/30 text-sky-200' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {memberCount}
                        </span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <div className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option: Unassigned */}
          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={handleSelectUnassigned}
              className={`w-full text-start px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                isUnassigned
                  ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/25 text-white font-bold border border-sky-400/40 shadow-sm shadow-sky-500/10'
                  : 'hover:bg-white/10 text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isUnassigned
                      ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{t('unassigned')}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${
                    isUnassigned ? 'bg-sky-500/30 text-sky-200' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {unassignedCount}
                </span>
                {isUnassigned ? (
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          )}

          {/* Option: Completed */}
          <div className="pt-1.5 mt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleSelectCompleted}
              className={`w-full text-start px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-white font-bold border border-emerald-400/40 shadow-sm shadow-emerald-500/10'
                  : 'hover:bg-white/10 text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="truncate">{t('completed')}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none min-w-[18px] text-center ${
                    isCompleted ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {completedTasks.length}
                </span>
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
