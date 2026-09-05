import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useInstall } from '../context/InstallContext';
import { Download, X } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const { t } = useLanguage();
  const { isInstalled, isBannerDismissed, dismissBanner, promptInstall } = useInstall();

  if (isInstalled || isBannerDismissed) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-4 md:max-w-md z-40 p-4 bg-slate-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-sky-400/40 animate-in fade-in slide-in-from-bottom-4 shadow-black/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 text-sky-300 shadow-sm shadow-sky-500/20">
          <Download className="w-5 h-5 text-sky-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black truncate gradient-text">{t('installTickApp')}</h4>
          <p className="text-xs text-slate-300 truncate font-medium">{t('installAppDesc')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={promptInstall}
          className="px-3.5 py-1.5 glow-btn text-white text-xs font-bold rounded-lg shadow"
        >
          {t('install')}
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
