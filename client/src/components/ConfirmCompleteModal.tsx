import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { TaskWithAssignee } from '../types';
import { Check, CheckCircle2, X, RefreshCw, Repeat } from 'lucide-react';

interface ConfirmCompleteModalProps {
  isOpen: boolean;
  task: TaskWithAssignee | null;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const ConfirmCompleteModal: React.FC<ConfirmCompleteModalProps> = ({
  isOpen,
  task,
  onConfirm,
  onClose,
  loading = false,
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
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
          disabled={loading}
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
        <div className="my-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-sm font-bold text-white truncate text-start flex-1">
            {task.title}
          </span>
        </div>

        {/* Recurring notice if applicable */}
        {task.recurrence_rule && (
          <div className="flex items-center gap-2 text-xs text-sky-300 bg-sky-500/10 border border-sky-400/20 px-3 py-2 rounded-xl mb-4 font-medium">
            <Repeat className="w-3.5 h-3.5 shrink-0 text-sky-400" />
            <span>{t('toastTaskCompletedRecurring')}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>{t('confirmCompleteBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
