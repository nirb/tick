import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useInstall, type PlatformType } from '../context/InstallContext';
import {
  Share,
  PlusSquare,
  Smartphone,
  Laptop,
  MoreVertical,
  Download,
  X,
  Sparkles,
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { platform, canPromptInstall, promptInstall } = useInstall();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>(platform);

  // Synchronize initial platform when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform(platform);
    }
  }, [isOpen, platform]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    await promptInstall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900/95 backdrop-blur-2xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/15 relative max-h-[90vh] overflow-y-auto text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/60 border border-white/12 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setSelectedPlatform('ios')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              selectedPlatform === 'ios'
                ? 'bg-gradient-to-r from-sky-500/30 to-indigo-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('android')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              selectedPlatform === 'android'
                ? 'bg-gradient-to-r from-sky-500/30 to-indigo-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('desktop')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              selectedPlatform === 'desktop'
                ? 'bg-gradient-to-r from-sky-500/30 to-indigo-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0 shadow-sm shadow-sky-500/20">
            {selectedPlatform === 'desktop' ? (
              <Laptop className="w-6 h-6" />
            ) : (
              <Smartphone className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black gradient-text">
              {selectedPlatform === 'ios'
                ? t('installOnIphone')
                : selectedPlatform === 'android'
                ? t('installOnAndroid')
                : t('installOnDesktop')}
            </h3>
            {selectedPlatform === 'ios' && (
              <p className="text-xs text-amber-300 font-bold">{t('iosPushNotice')}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-300 font-medium mb-5 leading-relaxed">
          {selectedPlatform === 'ios'
            ? t('iosExplanation')
            : selectedPlatform === 'android'
            ? t('androidExplanation')
            : t('desktopExplanation')}
        </p>

        {/* Native One-Click Install Button if supported by browser */}
        {canPromptInstall && selectedPlatform !== 'ios' && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full mb-5 py-3 px-4 glow-btn text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('install')}</span>
          </button>
        )}

        {/* Steps List */}
        <div className="space-y-3 mb-6">
          {selectedPlatform === 'ios' && (
            <>
              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  1
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Share className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('step1Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('step1Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  2
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <PlusSquare className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('step2Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('step2Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  3
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {t('step3Title')}
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('step3Desc')}</p>
                </div>
              </div>
            </>
          )}

          {selectedPlatform === 'android' && (
            <>
              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  1
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <MoreVertical className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('androidStep1Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('androidStep1Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  2
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('androidStep2Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('androidStep2Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  3
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {t('step3Title')}
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('installAppDesc')}</p>
                </div>
              </div>
            </>
          )}

          {selectedPlatform === 'desktop' && (
            <>
              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  1
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('desktopStep1Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('desktopStep1Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm shadow-sky-500/30">
                  2
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>{t('desktopStep2Title')}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{t('desktopStep2Desc')}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Close / Got it */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/15 transition-colors"
        >
          {t('gotIt')}
        </button>
      </div>
    </div>
  );
};
