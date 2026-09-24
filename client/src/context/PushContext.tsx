import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  getCurrentPushSubscription,
  isIOS,
  isStandalone,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push';
import { useAuth } from './AuthContext';

interface PushContextType {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  loading: boolean;
  showIOSGuide: boolean;
  setShowIOSGuide: (show: boolean) => void;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<{ sent: number }>;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export const PushProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (!supported) {
        setPermission('unsupported');
        return;
      }

      setPermission(Notification.permission);
      await registerServiceWorker();

      if (user) {
        const sub = await getCurrentPushSubscription();
        setIsSubscribed(!!sub);
        if (sub) {
          try {
            await api.push.subscribe(sub.toJSON() as PushSubscriptionJSON);
          } catch (err) {
            console.warn('Failed syncing push subscription with current user:', err);
          }
        }
      }
    };

    checkSupport();
  }, [user]);

  const subscribe = async (): Promise<boolean> => {
    // iOS Standalone Check (NFR-PLAT-1 & Skill pwa-onboarding)
    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return false;
    }

    if (!isSupported) {
      alert('Web Push is not supported in this browser.');
      return false;
    }

    setLoading(true);
    try {
      // 1. Fetch public VAPID key
      const { publicKey } = await api.push.getPublicKey();

      // 2. Subscribe browser push manager
      const sub = await subscribeToPush(publicKey);

      // 3. Register with backend D1
      const subJSON = sub.toJSON();
      await api.push.subscribe(subJSON as PushSubscriptionJSON);

      setIsSubscribed(true);
      setPermission(Notification.permission);
      return true;
    } catch (err: any) {
      console.error('Failed to enable push notifications:', err);
      alert(err.message || 'Could not enable push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const sub = await getCurrentPushSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint);
        await unsubscribeFromPush();
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async (): Promise<{ sent: number }> => {
    setLoading(true);
    try {
      const res = await api.push.test();
      return { sent: res.sent };
    } finally {
      setLoading(false);
    }
  };

  return (
    <PushContext.Provider
      value={{
        isSupported,
        permission,
        isSubscribed,
        loading,
        showIOSGuide,
        setShowIOSGuide,
        subscribe,
        unsubscribe,
        sendTestNotification,
      }}
    >
      {children}
    </PushContext.Provider>
  );
};

export function usePush() {
  const context = useContext(PushContext);
  if (!context) {
    throw new Error('usePush must be used within a PushProvider');
  }
  return context;
}
