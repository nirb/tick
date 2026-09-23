import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const VersionUpdateModal: React.FC = () => {
  const { t } = useLanguage();
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isCheckingRef = useRef(false);

  const currentBuildId = import.meta.env.VITE_APP_BUILD_ID;

  const checkForUpdate = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // 1. Check Service Worker registration for waiting workers or trigger update check
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.update().catch(() => {});
          if (reg.waiting) {
            setIsUpdateAvailable(true);
            isCheckingRef.current = false;
            return;
          }
        }
      }

      // 2. Check /version.json from network bypassing cache
      if (!currentBuildId) {
        isCheckingRef.current = false;
        return;
      }

      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        isCheckingRef.current = false;
        return;
      }

      const data = await res.json();
      if (
        data?.version &&
        typeof data.version === 'string' &&
        data.version !== currentBuildId
      ) {
        setIsUpdateAvailable(true);
      }
    } catch {
      // Offline or network error - silently ignore
    } finally {
      isCheckingRef.current = false;
    }
  }, [currentBuildId]);

  useEffect(() => {
    // Initial check after app mount
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 2500);

    // Periodic check every 60 seconds
    const interval = setInterval(checkForUpdate, 60 * 1000);

    // Check on visibility change (e.g. user unlocks phone or switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    // Check on window focus & reconnect
    const handleFocus = () => checkForUpdate();
    const handleOnline = () => checkForUpdate();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Listen for Service Worker updatefound event
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) {
          setIsUpdateAvailable(true);
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (installing) {
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      });
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkForUpdate]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUpdateAvailable && !isRefreshing) {
        setIsDismissed(true);
      }
    };
    if (isUpdateAvailable) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUpdateAvailable, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 1. Wipe cache storage to guarantee freshly built assets are loaded
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      // 2. Notify waiting service worker to skip waiting
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (err) {
      console.warn('Error clearing caches before reload:', err);
    }

    // Force hard reload from server
    window.location.reload();
  };

  if (!isUpdateAvailable) return null;

  // If user clicked "Later", show a non-intrusive floating indicator
  if (isDismissed) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 start-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800/95 border border-sky-400/40 text-sky-200 text-xs font-bold shadow-xl shadow-sky-500/25 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-sky-300" />
          <span>{t('newUpdateTitle')}</span>
          <span className="bg-sky-500/25 text-sky-200 border border-sky-400/40 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
            {t('refreshApp')}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRefreshing) setIsDismissed(true);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-sky-500/30 relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          disabled={isRefreshing}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="flex flex-col items-center text-center pt-2 pb-2">
          {/* Animated Glow Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 border border-sky-400/40 text-sky-400 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/20 relative">
            <Sparkles className="w-8 h-8 animate-pulse text-sky-300" />
            <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border-2 border-slate-900"></span>
            </span>
          </div>

          {/* Heading */}
          <h2 id="update-modal-title" className="text-lg sm:text-xl font-bold text-white mb-2">
            {t('newUpdateTitle')}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed mb-6">
            {t('newUpdateDesc')}
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full py-3.5 px-4 rounded-2xl glow-btn text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? t('refreshing') : t('refreshApp')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              disabled={isRefreshing}
              className="w-full py-2 px-4 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t('updateLater')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
