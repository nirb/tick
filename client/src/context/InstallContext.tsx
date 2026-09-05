import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type PlatformType = 'ios' | 'android' | 'desktop';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallContextType {
  isInstalled: boolean;
  canPromptInstall: boolean;
  platform: PlatformType;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  promptInstall: () => Promise<void>;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
}

declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const InstallContext = createContext<InstallContextType | undefined>(undefined);

function detectPlatform(): PlatformType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return 'ios';
  }
  if (/android/i.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export const InstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState<boolean>(checkIsInstalled);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== 'undefined' ? window.deferredInstallPrompt || null : null)
  );
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [platform] = useState<PlatformType>(detectPlatform);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('tick_install_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check initial standalone status
    setIsInstalled(checkIsInstalled());

    // Listen for display-mode media query change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Handler for captured beforeinstallprompt
    const handlePrompt = () => {
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt);
      }
    };

    // Handler for native event if not already caught by index.html script
    const handleNativePrompt = (e: Event) => {
      e.preventDefault();
      window.deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Handler for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredInstallPrompt = null;
      setIsInstallModalOpen(false);
    };

    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
    }

    window.addEventListener('tick:beforeinstallprompt', handlePrompt);
    window.addEventListener('beforeinstallprompt', handleNativePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('tick:appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('tick:beforeinstallprompt', handlePrompt);
      window.removeEventListener('beforeinstallprompt', handleNativePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('tick:appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || window.deferredInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          window.deferredInstallPrompt = null;
        }
      } catch (err) {
        console.error('Error prompting install:', err);
        setIsInstallModalOpen(true);
      }
    } else {
      // If browser cannot prompt programmatically (iOS, Firefox, desktop Safari, etc.)
      setIsInstallModalOpen(true);
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    try {
      sessionStorage.setItem('tick_install_banner_dismissed', 'true');
    } catch {
      // Ignore storage errors in private mode
    }
  }, []);

  return (
    <InstallContext.Provider
      value={{
        isInstalled,
        canPromptInstall: !!(deferredPrompt || (typeof window !== 'undefined' && window.deferredInstallPrompt)),
        platform,
        isInstallModalOpen,
        setIsInstallModalOpen,
        promptInstall,
        isBannerDismissed,
        dismissBanner,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
};

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error('useInstall must be used within an InstallProvider');
  }
  return context;
}
