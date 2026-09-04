import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Share, PlusSquare, Smartphone, X } from 'lucide-react';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t('installOnIphone')}</h3>
            <p className="text-xs text-slate-500">{t('iosPushNotice')}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          {t('iosExplanation')}
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm font-semibold">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-indigo-600 inline" /> <span className="font-semibold">{t('step1Title')}</span>
              </p>
              <p className="text-xs text-slate-500">{t('step1Desc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm font-semibold">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                <PlusSquare className="w-4 h-4 text-indigo-600 inline" /> <span className="font-semibold">{t('step2Title')}</span>
              </p>
              <p className="text-xs text-slate-500">{t('step2Desc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm font-semibold">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {t('step3Title')}
              </p>
              <p className="text-xs text-slate-500">{t('step3Desc')}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-colors"
        >
          {t('gotIt')}
        </button>
      </div>
    </div>
  );
};
