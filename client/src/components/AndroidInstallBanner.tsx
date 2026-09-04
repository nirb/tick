import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const AndroidInstallBanner: React.FC = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-4 md:max-w-md z-40 p-4 bg-indigo-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-indigo-700 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-700 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-indigo-200" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t('installTickApp')}</h4>
          <p className="text-xs text-indigo-200">{t('installAppDesc')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3.5 py-1.5 bg-white text-indigo-900 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow"
        >
          {t('install')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-indigo-300 hover:text-white rounded-lg transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
