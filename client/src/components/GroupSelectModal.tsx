import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { GroupMembership } from '../types';
import { Users, Check, ArrowRight, RefreshCw, X } from 'lucide-react';

interface GroupSelectModalProps {
  isOpen: boolean;
  groups: GroupMembership[];
  currentGroupId?: string;
  initialSelectedGroupId?: string | null;
  initialAutoEnter?: boolean;
  onSelectGroup: (groupId: string, autoEnter: boolean) => Promise<void>;
  onClose: () => void;
}

export const GroupSelectModal: React.FC<GroupSelectModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <GroupSelectModalContent {...props} />;
};

const GroupSelectModalContent: React.FC<GroupSelectModalProps> = ({
  groups,
  currentGroupId,
  initialSelectedGroupId,
  initialAutoEnter = false,
  onSelectGroup,
  onClose,
}) => {
  const { t } = useLanguage();
  const fallbackId = currentGroupId || (groups.length > 0 ? groups[0].group_id : '');
  const validInitial =
    initialSelectedGroupId && groups.some((g) => g.group_id === initialSelectedGroupId)
      ? initialSelectedGroupId
      : fallbackId;

  const [selectedGroupId, setSelectedGroupId] = useState<string>(validInitial);
  const [autoEnter, setAutoEnter] = useState<boolean>(initialAutoEnter);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleConfirm = async () => {
    if (!selectedGroupId || submitting) return;
    setSubmitting(true);
    try {
      await onSelectGroup(selectedGroupId, autoEnter);
    } catch (err) {
      console.error('Failed to select group:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/15 relative max-h-[90vh] overflow-y-auto text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center shadow-md shadow-sky-500/10 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {t('selectGroupModalTitle')}
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              {t('selectGroupModalSubtitle')}
            </p>
          </div>
        </div>

        {/* Groups Selection List */}
        <div className="space-y-2 mt-5 mb-5 max-h-64 overflow-y-auto pe-1">
          {groups.map((g) => {
            const isSelected = g.group_id === selectedGroupId;
            const isCurrent = g.group_id === currentGroupId;

            return (
              <button
                key={g.group_id}
                type="button"
                disabled={submitting}
                onClick={() => setSelectedGroupId(g.group_id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400/60 shadow-md shadow-sky-500/10 ring-1 ring-sky-400/40'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-sky-400/20 border-sky-400/40 text-sky-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{g.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] text-sky-300 font-medium px-1.5 py-0.2 bg-sky-500/10 rounded border border-sky-400/30">
                          {t('you')}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize border mt-1 ${
                        g.role === 'admin'
                          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                          : 'bg-white/10 text-slate-300 border-white/15'
                      }`}
                    >
                      {g.role === 'admin' ? t('adminRole') : t('memberRole')}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 ms-3">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm shadow-sky-500/50">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-600/70" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Checkbox: Automatically enter last used group */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 mb-6">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoEnter}
              disabled={submitting}
              onChange={(e) => setAutoEnter(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-400 focus:ring-offset-slate-900 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                {t('autoEnterLastGroupCheckbox')}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                {t('autoEnterNoticeWeek')}
              </span>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedGroupId || submitting}
          className="w-full py-3.5 px-4 glow-btn text-white rounded-2xl text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>{t('confirmSelectGroup')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
