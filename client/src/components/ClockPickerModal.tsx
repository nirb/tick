import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Clock as ClockIcon, X, Check, Sun, Moon } from 'lucide-react';

interface ClockPickerModalProps {
  isOpen: boolean;
  value: string; // 'HH:mm' or ''
  onChange: (time: string) => void;
  onClose: () => void;
}

export const ClockPickerModal: React.FC<ClockPickerModalProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
}) => {
  const { t } = useLanguage();
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Parse initial hour and minute
  const parsed = useMemo(() => {
    if (value && value.includes(':')) {
      const parts = value.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return { hour: Math.min(23, Math.max(0, h)), minute: Math.min(59, Math.max(0, m)) };
      }
    }
    return { hour: 10, minute: 0 };
  }, [value]);

  const [selectedHour, setSelectedHour] = useState<number>(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsed.minute);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  // Reset/sync when opened or value changed
  useEffect(() => {
    if (isOpen) {
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setMode('hours');
    }
  }, [isOpen, parsed]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPM = selectedHour >= 12;
  const displayHour12 = selectedHour % 12 === 0 ? 12 : selectedHour % 12;

  const toggleAmPm = (target: 'AM' | 'PM') => {
    if (target === 'AM' && isPM) {
      setSelectedHour((prev) => prev - 12);
    } else if (target === 'PM' && !isPM) {
      setSelectedHour((prev) => prev + 12);
    }
  };

  const handleHourSelect = (h12: number, autoAdvance = true) => {
    let new24 = h12 % 12;
    if (isPM) new24 += 12;
    setSelectedHour(new24);
    if (autoAdvance) {
      setTimeout(() => {
        setMode('minutes');
      }, 200);
    }
  };

  const handleMinuteSelect = (min: number) => {
    setSelectedMinute(min);
  };

  const updateFromDialCoords = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hours') {
      let h12 = Math.round(angle / 30) % 12;
      if (h12 === 0) h12 = 12;
      handleHourSelect(h12, false);
    } else {
      let min = Math.round(angle / 6) % 60;
      handleMinuteSelect(min);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromDialCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromDialCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (mode === 'hours') {
        setTimeout(() => {
          setMode('minutes');
        }, 150);
      }
    }
  };

  const adjustMinutes = (delta: number) => {
    setSelectedMinute((prev) => {
      let next = (prev + delta) % 60;
      if (next < 0) next += 60;
      return next;
    });
  };

  const handleDone = () => {
    const hh = String(selectedHour).padStart(2, '0');
    const mm = String(selectedMinute).padStart(2, '0');
    onChange(`${hh}:${mm}`);
    onClose();
  };

  const handlePreset = (h: number, m: number) => {
    setSelectedHour(h);
    setSelectedMinute(m);
  };

  // Clock Hand Angle
  const handAngle = mode === 'hours' ? (displayHour12 % 12) * 30 : selectedMinute * 6;

  // Preset hours list (1 to 12)
  const hourPositions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutePositions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const radius = 80; // Distance in pixels from center (224px wide dial)

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
        aria-labelledby="clock-picker-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-xs sm:max-w-sm w-full p-5 shadow-2xl border border-white/15 relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <ClockIcon className="w-4 h-4" />
            </div>
            <h3 id="clock-picker-title" className="text-base font-bold text-white">
              {t('selectTime')}
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

        {/* Digital Display & AM/PM */}
        <div className="flex items-center justify-center gap-3 mb-4 bg-slate-950/60 p-2.5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={`px-3 py-1.5 rounded-xl text-2xl font-bold font-mono transition-all ${
                mode === 'hours'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {String(displayHour12).padStart(2, '0')}
            </button>
            <span className="text-2xl font-bold text-slate-500 animate-pulse">:</span>
            <button
              type="button"
              onClick={() => setMode('minutes')}
              className={`px-3 py-1.5 rounded-xl text-2xl font-bold font-mono transition-all ${
                mode === 'minutes'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {String(selectedMinute).padStart(2, '0')}
            </button>
          </div>

          {/* AM / PM Pills */}
          <div className="flex flex-col gap-1 border-s border-white/10 ps-2.5">
            <button
              type="button"
              onClick={() => toggleAmPm('AM')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                !isPM
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sun className="w-3 h-3" /> AM
            </button>
            <button
              type="button"
              onClick={() => toggleAmPm('PM')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                isPM
                  ? 'bg-indigo-500 text-white font-black shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Moon className="w-3 h-3" /> PM
            </button>
          </div>
        </div>

        {/* Circular Clock Face */}
        <div className="relative w-56 h-56 mx-auto my-2 select-none touch-none">
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-full rounded-full bg-slate-950/80 border border-white/10 shadow-inner relative flex items-center justify-center cursor-pointer"
          >
            {/* Center Pivot Dot */}
            <div className="w-3.5 h-3.5 rounded-full bg-sky-400 shadow-md shadow-sky-400/50 z-30 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            {/* Hand Line & Tip Selector */}
            <div
              className="absolute pointer-events-none transition-transform duration-100 ease-out z-10"
              style={{
                top: `calc(50% - ${radius}px)`,
                left: 'calc(50% - 1px)',
                width: '2px',
                height: `${radius}px`,
                transformOrigin: '1px 100%',
                transform: `rotate(${handAngle}deg)`,
              }}
            >
              {/* Hand Line */}
              <div className="w-full h-full bg-sky-400" />

              {/* Hand selector circle at tip */}
              <div className="w-8 h-8 rounded-full bg-sky-500 shadow-lg shadow-sky-500/50 border border-sky-300 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Dial Labels */}
            {mode === 'hours'
              ? hourPositions.map((hour) => {
                  const angle = (hour % 12) * 30;
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const x = Math.round(Math.cos(rad) * radius);
                  const y = Math.round(Math.sin(rad) * radius);
                  const isSelected = displayHour12 === hour;

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHourSelect(hour);
                      }}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full transition-colors z-20 ${
                        isSelected
                          ? 'text-white font-extrabold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {hour}
                    </button>
                  );
                })
              : minutePositions.map((min) => {
                  const angle = min * 6;
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const x = Math.round(Math.cos(rad) * radius);
                  const y = Math.round(Math.sin(rad) * radius);
                  const isSelected = selectedMinute === min;

                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMinuteSelect(min);
                      }}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded-full transition-colors z-20 ${
                        isSelected
                          ? 'text-white font-extrabold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {String(min).padStart(2, '0')}
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Fine-tuning and quick chips */}
        <div className="flex items-center justify-between gap-1.5 my-3 px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              className="px-2 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            >
              -5m
            </button>
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              className="px-2 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            >
              +5m
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handlePreset(10, 0)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors shrink-0 border ${
                selectedHour === 10 && selectedMinute === 0
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              10:00 AM
            </button>
            <button
              type="button"
              onClick={() => handlePreset(14, 0)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors shrink-0 border ${
                selectedHour === 14 && selectedMinute === 0
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              2:00 PM
            </button>
            <button
              type="button"
              onClick={() => handlePreset(18, 0)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors shrink-0 border ${
                selectedHour === 18 && selectedMinute === 0
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              6:00 PM
            </button>
          </div>
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
            onClick={handleDone}
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
