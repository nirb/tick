import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { useLanguage } from '../context/LanguageContext';
import { useInstall } from '../context/InstallContext';
import {
  Bell,
  BellOff,
  Send,
  LogOut,
  CheckCircle2,
  Globe,
  Pencil,
  Check,
  X,
  RefreshCw,
  Download,
} from 'lucide-react';

interface NavbarProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onShowToast }) => {
  const { user, logout, updateUserName } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, sendTestNotification, loading: pushLoading } = usePush();
  const { language, toggleLanguage, t } = useLanguage();
  const { isInstalled, promptInstall } = useInstall();
  const [showPushMenu, setShowPushMenu] = useState(false);
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [savingUserName, setSavingUserName] = useState(false);

  const pushMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pushMenuRef.current && !pushMenuRef.current.contains(event.target as Node)) {
        setShowPushMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePushClick = async () => {
    if (!isSubscribed) {
      const ok = await subscribe();
      if (ok) {
        onShowToast(t('toastPushEnabled'), 'success');
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
        onShowToast(t('toastTestPushSent'), 'success');
      } else {
        onShowToast(t('toastNoActiveSubs'), 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send test notification', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    setShowPushMenu(false);
    await unsubscribe();
    onShowToast(t('toastUnsubscribed'), 'info');
  };

  const handleStartEditingUserName = () => {
    if (!user) return;
    setEditedUserName(user.name);
    setIsEditingUserName(true);
  };

  const handleCancelEditingUserName = () => {
    setIsEditingUserName(false);
    setEditedUserName('');
  };

  const handleSaveUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editedUserName.trim();
    if (!trimmed || trimmed === user?.name) {
      setIsEditingUserName(false);
      return;
    }

    setSavingUserName(true);
    try {
      await updateUserName(trimmed);
      setIsEditingUserName(false);
      onShowToast(t('toastUserNameUpdated'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to update name', 'error');
    } finally {
      setSavingUserName(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/12 shadow-lg shadow-black/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-500/25 shrink-0">
            ✓
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight gradient-text">{t('appName')}</h1>
        </div>

        {/* User Persona Switcher & Push Controls */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Toggle */}
          <button
            onClick={toggleLanguage}
            title={t('switchLanguage')}
            className="px-2.5 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-100 flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'en' ? 'עברית' : 'English'}</span>
          </button>

          {/* Install Button (visible when not installed) */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              title={t('installTickApp')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-sky-500/25"
            >
              <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">{t('install')}</span>
            </button>
          )}

          {/* User Profile Badge */}
          {user && (
            isEditingUserName ? (
              <form onSubmit={handleSaveUserName} className="hidden sm:flex items-center gap-1 bg-slate-950/80 border border-white/20 px-2 py-1 rounded-xl">
                <input
                  type="text"
                  value={editedUserName}
                  onChange={(e) => setEditedUserName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  autoFocus
                  maxLength={40}
                  className="w-24 px-1.5 py-0.5 text-xs font-bold text-white border border-sky-400/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400 bg-slate-900"
                  disabled={savingUserName}
                />
                <button
                  type="submit"
                  disabled={savingUserName || !editedUserName.trim()}
                  title={t('save')}
                  className="p-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                >
                  {savingUserName ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditingUserName}
                  disabled={savingUserName}
                  title={t('cancel')}
                  className="p-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-white/15 rounded-xl text-xs font-bold text-slate-100">
                <span className="text-sm">{user.avatar_url || '👤'}</span>
                <span className="max-w-[120px] truncate">{user.name}</span>
                <span className="text-[10px] bg-white/15 text-slate-200 px-1.5 py-0.5 rounded-full capitalize font-semibold">
                  {user.role === 'admin' ? t('adminRole') : t('memberRole')}
                </span>
                <button
                  onClick={handleStartEditingUserName}
                  title={t('editUserName')}
                  className="p-0.5 text-slate-400 hover:text-sky-300 rounded transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )
          )}

          {/* Web Push Toggle Button & Dropdown */}
          <div className="relative" ref={pushMenuRef}>
            <button
              onClick={handlePushClick}
              disabled={pushLoading}
              title={isSubscribed ? t('pushActiveNotice') : t('enablePush')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30 animate-pulse'
                }`}
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-4 h-4 text-emerald-300" />
                  <span className="hidden sm:inline">{t('pushOn')}</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-sky-300" />
                  <span className="hidden sm:inline">{t('enablePush')}</span>
                </>
              )}
            </button>

            {showPushMenu && isSubscribed && (
              <div className="absolute end-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 p-2 z-40 text-xs text-slate-100">
                <div className="px-2 py-1.5 border-b border-white/10 mb-1 flex items-center gap-1.5 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('pushActiveNotice')}
                </div>
                <button
                  onClick={handleTestPush}
                  className="w-full text-start px-2.5 py-2 hover:bg-white/10 rounded-lg flex items-center gap-2 text-slate-100 font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  {t('sendTestNotification')}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  className="w-full text-start px-2.5 py-2 hover:bg-rose-500/20 text-rose-300 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  {t('turnOffNotifications')}
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          {user && (
            <button
              onClick={logout}
              title={t('signOut')}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
