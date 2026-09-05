import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useInstall } from '../context/InstallContext';
import { Download, X } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const { t } = useLanguage();
  const { isInstalled, isBannerDismissed, dismissBanner, promptInstall } = useInstall();

  if (isInstalled || isBannerDismissed) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-4 md:max-w-md z-40 p-4 bg-indigo-900 text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-indigo-700/80 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-700/80 flex items-center justify-center shrink-0 shadow-inner">
          <Download className="w-5 h-5 text-indigo-200" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold truncate">{t('installTickApp')}</h4>
          <p className="text-xs text-indigo-200 truncate">{t('installAppDesc')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={promptInstall}
          className="px-3.5 py-1.5 bg-white text-indigo-900 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow"
        >
          {t('install')}
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          className="p-1.5 text-indigo-300 hover:text-white rounded-lg transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
