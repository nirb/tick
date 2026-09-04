import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { Bell, BellOff, Users, Wifi, WifiOff, Send, LogOut, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  onOpenHousehold: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenHousehold, onShowToast, isOnline }) => {
  const { user, group, loginDemo, logout } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, sendTestNotification, loading: pushLoading } = usePush();
  const [showPushMenu, setShowPushMenu] = useState(false);

  const handlePushClick = async () => {
    if (!isSubscribed) {
      const ok = await subscribe();
      if (ok) {
        onShowToast('Push notifications enabled successfully! 🔔', 'success');
      }
    } else {
      setShowPushMenu(!showPushMenu);
    }
  };

  const handleTestPush = async () => {
    setShowPushMenu(false);
    try {
      const res = await sendTestNotification();
      if (res.sent > 0) {
        onShowToast('Test notification dispatched! Check your screen. 🎉', 'success');
      } else {
        onShowToast('No active subscriptions could be reached.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send test notification', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    setShowPushMenu(false);
    await unsubscribe();
    onShowToast('Unsubscribed from push notifications.', 'info');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Household */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-100">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Tick</h1>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {group && (
              <button
                onClick={onOpenHousehold}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium text-left"
              >
                <Users className="w-3 h-3" />
                <span className="truncate max-w-[130px] sm:max-w-xs">{group.name}</span>
              </button>
            )}
          </div>
        </div>

        {/* User Persona Switcher & Push Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Persona Switcher */}
          {user && (
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => loginDemo('mom')}
                title="Switch to Sarah (Mom)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  user.email === 'sarah.mom@tickfamily.app'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👩</span> <span>Mom</span>
              </button>
              <button
                onClick={() => loginDemo('dad')}
                title="Switch to Alex (Dad)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  user.email === 'alex.dad@tickfamily.app'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👨</span> <span>Dad</span>
              </button>
              <button
                onClick={() => loginDemo('teen')}
                title="Switch to Leo (Teen)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  user.email === 'leo.teen@tickfamily.app'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👦</span> <span>Leo</span>
              </button>
            </div>
          )}

          {/* Web Push Toggle Button & Dropdown */}
          <div className="relative">
            <button
              onClick={handlePushClick}
              disabled={pushLoading}
              title={isSubscribed ? 'Push Notifications Active' : 'Enable Push Notifications'}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isSubscribed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 animate-pulse'
              }`}
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Push On</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Enable Push</span>
                </>
              )}
            </button>

            {showPushMenu && isSubscribed && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 text-xs">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1 flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Push Notifications Active
                </div>
                <button
                  onClick={handleTestPush}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  Send Test Notification
                </button>
                <button
                  onClick={handleUnsubscribe}
                  className="w-full text-left px-2.5 py-2 hover:bg-rose-50 text-rose-600 rounded-lg flex items-center gap-2 font-medium"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Turn Off Notifications
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
