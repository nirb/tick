import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { TaskWithAssignee } from '../types';
import { Check, CheckCircle2, X, RefreshCw, Repeat, Trash2 } from 'lucide-react';

interface ConfirmCompleteModalProps {
  isOpen: boolean;
  task: TaskWithAssignee | null;
  onConfirm: () => void;
  onClose: () => void;
  onDelete?: () => void;
  loading?: boolean;
  deleting?: boolean;
}

export const ConfirmCompleteModal: React.FC<ConfirmCompleteModalProps> = ({
  isOpen,
  task,
  onConfirm,
  onClose,
  onDelete,
  loading = false,
  deleting = false,
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !deleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading, deleting]);

  if (!isOpen || !task) return null;

  const isRecurring = Boolean(task.recurrence_rule);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && !deleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-complete-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl border border-white/15 relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading || deleting}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3
            id="confirm-complete-title"
            className="text-lg sm:text-xl font-black text-white tracking-tight"
          >
            {t('confirmCompleteTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            {t('confirmCompleteMessage')}
          </p>
        </div>

        {/* Task Title Preview Card */}
        <div className="my-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-sm font-bold text-white truncate text-start flex-1">
            {task.title}
          </span>
        </div>

        {/* Recurring notice if applicable */}
        {task.recurrence_rule && (
          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-400/20 px-3 py-2 rounded-xl mb-3 font-medium">
            <Repeat className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span>
              {task.recurrence_rule.includes('DAILY')
                ? t('daily')
                : task.recurrence_rule.includes('WEEKLY')
                  ? t('weekly')
                  : task.recurrence_rule.includes('MONTHLY')
                    ? t('monthly')
                    : t('recurring')}
            </span>
          </div>
        )}

        {/* Operations Info Card */}
        <div className="mb-4 p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs text-start">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <div className="flex-1 leading-relaxed">
              <span className="font-bold text-emerald-300 me-1">
                {t('confirmCompleteBtn')}:
              </span>
              <span className="text-slate-300">
                {isRecurring
                  ? t('confirmCompleteRecurringOpDesc')
                  : t('confirmCompleteOpDesc')}
              </span>
            </div>
          </div>
          {onDelete && !isRecurring && (
            <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
              <div className="w-5 h-5 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-3 h-3" />
              </div>
              <div className="flex-1 leading-relaxed">
                <span className="font-bold text-rose-300 me-1">
                  {t('delete')}:
                </span>
                <span className="text-slate-300">
                  {t('confirmDeleteOpDesc')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || deleting}
            className="flex-1 min-w-0 px-2.5 sm:px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 cursor-pointer text-center"
          >
            <span className="truncate">{t('cancel')}</span>
          </button>
          {onDelete && !isRecurring && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading || deleting}
              className="flex-1 min-w-0 px-2.5 sm:px-3 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-40 cursor-pointer"
            >
              {deleting ? (
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{t('delete')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || deleting}
            className="flex-1 min-w-0 px-2.5 sm:px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Check className="w-4 h-4 stroke-[3] shrink-0" />
            )}
            <span className="truncate">{t('confirmCompleteBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
