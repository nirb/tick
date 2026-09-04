import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Mail, ArrowRight, Sparkles, CheckCircle2, Globe } from 'lucide-react';

interface AuthScreenProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onShowToast }) => {
  const { loginDemo, loginWithEmail } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check URL query parameters for ?join=CODE
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setInviteCode(code.toUpperCase());
      setShowCustom(true);
    }
  }, []);

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), name.trim() || undefined, undefined, inviteCode.trim() || undefined);
      onShowToast(t('toastSignedIn'), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Sign in failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = async (persona: 'mom' | 'dad' | 'teen') => {
    setSubmitting(true);
    try {
      await loginDemo(persona);
      const personaName = persona === 'mom' ? t('sarahMom') : persona === 'dad' ? t('alexDad') : t('leoTeen');
      onShowToast(t('toastDemoSignedIn', { name: personaName }), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Demo sign in failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500">
      {/* Top Language Switcher */}
      <div className="absolute top-6 end-6">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-300" />
          <span>{language === 'en' ? 'עברית' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-500/20 mb-4">
            ✓
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('appName')}</h2>
          <p className="text-sm text-indigo-200/80 mt-1 max-w-xs">
            {t('appTagline')}
          </p>
        </div>

        {/* 1-Click Family Personas */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('instantDemoLogin')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleDemoClick('mom')}
              disabled={submitting}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all group active:scale-95 disabled:opacity-50"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">👩</span>
              <span className="text-xs font-bold text-slate-200">{t('mom')}</span>
              <span className="text-[10px] text-indigo-300/80 font-medium">{t('sarahMom')}</span>
            </button>

            <button
              onClick={() => handleDemoClick('dad')}
              disabled={submitting}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all group active:scale-95 disabled:opacity-50"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">👨</span>
              <span className="text-xs font-bold text-slate-200">{t('dad')}</span>
              <span className="text-[10px] text-indigo-300/80 font-medium">{t('alexDad')}</span>
            </button>

            <button
              onClick={() => handleDemoClick('teen')}
              disabled={submitting}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all group active:scale-95 disabled:opacity-50"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">👦</span>
              <span className="text-xs font-bold text-slate-200">{t('teen')}</span>
              <span className="text-[10px] text-indigo-300/80 font-medium">{t('leoTeen')}</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="bg-slate-900 px-3 text-slate-400 hover:text-white transition-colors"
            >
              {showCustom ? t('hideCustomSignIn') : t('customSignIn')}
            </button>
          </div>
        </div>

        {/* Custom Sign In Form */}
        {showCustom && (
          <form onSubmit={handleCustomSubmit} className="space-y-3.5 animate-in fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('yourName')}</label>
              <input
                type="text"
                placeholder="e.g. Rachel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('emailAddress')}</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('inviteCodeOptional')}
              </label>
              <input
                type="text"
                placeholder={t('inviteCodePlaceholder')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all mt-2"
            >
              <Mail className="w-4 h-4" />
              <span>{t('continueWithEmail')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        )}

        {/* Feature bullets */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-400">{t('edgeD1')}</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-400">{t('webPush')}</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-400">{t('offlinePwa')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
