import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface CalendarPickerModalProps {
  isOpen: boolean;
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (date: string) => void;
  onClose: () => void;
}

function formatYMD(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
}) => {
  const { t, language } = useLanguage();

  const today = useMemo(() => {
    const d = new Date();
    return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [currentYear, setCurrentYear] = useState(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      return parseInt(parts[0], 10) || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      return (parseInt(parts[1], 10) - 1) || new Date().getMonth();
    }
    return new Date().getMonth();
  });

  // Keep view in sync when value changes externally while opening
  useEffect(() => {
    if (isOpen) {
      if (value && value.includes('-')) {
        const parts = value.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setCurrentYear(y);
          setCurrentMonth(m);
        }
      } else {
        const now = new Date();
        setCurrentYear(now.getFullYear());
        setCurrentMonth(now.getMonth());
      }
    }
  }, [isOpen, value]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    language === 'he' ? 'he-IL' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const weekdays = language === 'he'
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days calculations
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonthCells: { day: number; ymd: string }[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    prevMonthCells.push({ day, ymd: formatYMD(prevY, prevM, day) });
  }

  const currentMonthCells: { day: number; ymd: string }[] = [];
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    currentMonthCells.push({ day, ymd: formatYMD(currentYear, currentMonth, day) });
  }

  const totalCellsSoFar = prevMonthCells.length + currentMonthCells.length;
  const nextMonthPadding = (7 - (totalCellsSoFar % 7)) % 7;
  const nextMonthCells: { day: number; ymd: string }[] = [];
  for (let day = 1; day <= nextMonthPadding; day++) {
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    nextMonthCells.push({ day, ymd: formatYMD(nextY, nextM, day) });
  }

  const handleSelect = (ymd: string) => {
    onChange(ymd);
    // Sync view if outside current month
    const parts = ymd.split('-');
    setCurrentYear(parseInt(parts[0], 10));
    setCurrentMonth(parseInt(parts[1], 10) - 1);
  };

  const handleQuickPreset = (presetYmd: string) => {
    handleSelect(presetYmd);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-picker-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/15 relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 id="calendar-picker-title" className="text-base font-bold text-white">
              {t('selectDate')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleQuickPreset(today)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border shrink-0 ${
              value === today
                ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            {t('today')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(tomorrow)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border shrink-0 ${
              value === tomorrow
                ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            {t('tomorrow')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(nextWeek)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border shrink-0 ${
              value === nextWeek
                ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            {t('nextWeek')}
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          <span className="text-sm font-bold text-white capitalize tracking-wide">
            {monthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {weekdays.map((wd, i) => (
            <div key={i} className="text-[11px] font-bold text-slate-400 py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {/* Previous Month Days */}
          {prevMonthCells.map((cell) => {
            const isSelected = value === cell.ymd;
            return (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => handleSelect(cell.ymd)}
                className={`h-9 w-full flex items-center justify-center text-xs rounded-xl transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 ring-2 ring-sky-400'
                    : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {cell.day}
              </button>
            );
          })}

          {/* Current Month Days */}
          {currentMonthCells.map((cell) => {
            const isSelected = value === cell.ymd;
            const isToday = cell.ymd === today;

            return (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => handleSelect(cell.ymd)}
                className={`h-9 w-full flex items-center justify-center text-xs font-medium rounded-xl transition-all relative ${
                  isSelected
                    ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold shadow-md shadow-sky-500/40 ring-2 ring-sky-300 scale-105 z-10'
                    : isToday
                    ? 'border border-sky-400/70 text-sky-300 font-bold bg-sky-500/10 hover:bg-sky-500/20'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cell.day}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-400" />
                )}
              </button>
            );
          })}

          {/* Next Month Days */}
          {nextMonthCells.map((cell) => {
            const isSelected = value === cell.ymd;
            return (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => handleSelect(cell.ymd)}
                className={`h-9 w-full flex items-center justify-center text-xs rounded-xl transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 ring-2 ring-sky-400'
                    : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            {t('clear')}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl glow-btn text-white flex items-center gap-1.5 shadow-md shadow-sky-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};
