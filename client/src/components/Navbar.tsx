import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { useLanguage } from '../context/LanguageContext';
import { useInstall } from '../context/InstallContext';
import {
  Menu,
  X,
  Bell,
  BellOff,
  Send,
  LogOut,
  Globe,
  Pencil,
  Check,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [savingUserName, setSavingUserName] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
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
    }
  };

  const handleTestPush = async () => {
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

        {/* Menu (3 horizontal lines) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Menu"
            className="p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {isMenuOpen && (
            <div className="absolute end-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 p-3 z-50 text-slate-100 animate-in fade-in zoom-in-95 space-y-3">
              {/* User Profile Info */}
              {user && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  {isEditingUserName ? (
                    <form onSubmit={handleSaveUserName} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editedUserName}
                        onChange={(e) => setEditedUserName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        autoFocus
                        maxLength={40}
                        className="flex-1 min-w-0 px-2.5 py-1 text-xs font-bold text-white border border-sky-400/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400 bg-slate-900"
                        disabled={savingUserName}
                      />
                      <button
                        type="submit"
                        disabled={savingUserName || !editedUserName.trim()}
                        title={t('save')}
                        className="p-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                      >
                        {savingUserName ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditingUserName}
                        disabled={savingUserName}
                        title={t('cancel')}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{user.avatar_url || '👤'}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{user.name}</span>
                            <button
                              onClick={handleStartEditingUserName}
                              title={t('editUserName')}
                              className="p-0.5 text-slate-400 hover:text-sky-300 rounded transition-colors shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block">{user.email}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 border ${
                          user.role === 'admin'
                            ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                            : 'bg-white/10 text-slate-300 border-white/15'
                        }`}
                      >
                        {user.role === 'admin' ? t('adminRole') : t('memberRole')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Menu Items */}
              <div className="space-y-1">
                {/* Language Switcher */}
                <button
                  onClick={toggleLanguage}
                  className="w-full px-2.5 py-2 hover:bg-white/10 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>{language === 'en' ? 'Language' : 'שפה'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-lg">
                    {language === 'en' ? 'עברית' : 'English'}
                  </span>
                </button>

                {/* Push Notifications */}
                {isSubscribed ? (
                  <div className="space-y-1 pt-1">
                    <div className="w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        <span>{t('pushActiveNotice')}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-lg">
                        {t('pushOn')}
                      </span>
                    </div>
                    <div className="ps-3 space-y-0.5">
                      <button
                        onClick={handleTestPush}
                        className="w-full px-2.5 py-1.5 hover:bg-white/10 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>{t('sendTestNotification')}</span>
                      </button>
                      <button
                        onClick={handleUnsubscribe}
                        className="w-full px-2.5 py-1.5 hover:bg-rose-500/15 rounded-lg flex items-center gap-2 text-xs font-medium text-rose-300 transition-colors"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        <span>{t('turnOffNotifications')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handlePushClick}
                    disabled={pushLoading}
                    className="w-full px-2.5 py-2 hover:bg-white/10 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <BellOff className="w-4 h-4 text-slate-400" />
                      <span>{t('enablePush')}</span>
                    </span>
                    <span className="text-[11px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      {pushLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>{t('enablePush')}</span>
                    </span>
                  </button>
                )}

                {/* Install App (if available) */}
                {!isInstalled && (
                  <button
                    onClick={() => {
                      promptInstall();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 hover:bg-sky-500/20 text-sky-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{t('installTickApp')}</span>
                  </button>
                )}
              </div>

              {/* Sign Out */}
              {user && (
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-2.5 py-2 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
