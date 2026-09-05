import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Mail, Lock, User as UserIcon, Users, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onShowToast }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // Check URL query parameters for ?join=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode('signup');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          onShowToast('Please enter your name', 'error');
          setSubmitting(false);
          return;
        }
        await register(
          name.trim(),
          email.trim(),
          password,
          groupName.trim() || undefined,
          inviteCode.trim() || undefined
        );
        onShowToast(t('toastSignedIn'), 'success');
      } else {
        await login(email.trim(), password);
        onShowToast(t('toastSignedIn'), 'success');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Authentication failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignInClick = () => {
    // Open Google email sign in modal
    setGooglePromptOpen(true);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    setSubmitting(true);
    try {
      const cleanEmail = googleEmail.trim();
      const defaultName = cleanEmail.split('@')[0];
      await loginWithGoogle({
        email: cleanEmail,
        name: defaultName,
        inviteCode: inviteCode.trim() || undefined,
      });
      setGooglePromptOpen(false);
      onShowToast(t('toastSignedIn'), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Google sign-in failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col justify-center items-center px-4 py-12">
      {/* Top Language Switcher */}
      <div className="absolute top-6 end-6">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>{language === 'en' ? 'עברית' : 'English'}</span>
        </button>
      </div>

      <div className="glass max-w-md w-full p-6 sm:p-8 relative shadow-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl">
        {/* Logo & Heading with Floating Animation */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-sky-500/30 mb-3 animate-float">
            ✓
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight gradient-text">{t('appName')}</h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-xs">
            {mode === 'login' ? t('welcomeBackDesc') : t('createAccountDesc')}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1.5 bg-slate-950/60 rounded-2xl border border-white/12 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('logIn')}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('signUp')}
          </button>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignInClick}
          disabled={submitting}
          className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
        >
          {/* Official Google G Logo */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{t('continueWithGoogle')}</span>
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/15"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0f172a] px-3 text-slate-300 uppercase tracking-wider font-bold">
              {t('orDivider')}
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-sky-400" /> {t('yourName')}
              </label>
              <input
                type="text"
                required
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-400" /> {t('emailAddress')}
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" /> {t('password')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" /> {t('groupNameOptional')}
                </label>
                <input
                  type="text"
                  placeholder={t('groupNameSignupPlaceholder')}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  {t('inviteCodeOptional')}
                </label>
                <input
                  type="text"
                  placeholder={t('inviteCodePlaceholder')}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="w-full py-3 px-4 glow-btn text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
          >
            <span>{submitting ? t('loading') : mode === 'login' ? t('logIn') : t('signUp')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="mt-5 text-center text-xs text-slate-300 font-medium">
          {mode === 'login' ? (
            <p>
              {t('dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-sky-400 hover:text-sky-300 font-bold underline ms-1"
              >
                {t('signUp')}
              </button>
            </p>
          ) : (
            <p>
              {t('alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sky-400 hover:text-sky-300 font-bold underline ms-1"
              >
                {t('logIn')}
              </button>
            </p>
          )}
        </div>

        {/* Feature bullets */}
        <div className="mt-8 pt-6 border-t border-white/12 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[11px] text-slate-200 font-semibold">{t('edgeD1')}</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[11px] text-slate-200 font-semibold">{t('webPush')}</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[11px] text-slate-200 font-semibold">{t('offlinePwa')}</span>
          </div>
        </div>
      </div>

      {/* Google Sign-In Email Modal */}
      {googlePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="text-base font-bold">Google Sign-In</h3>
                <p className="text-xs text-slate-400">Sign in with your Google account</p>
              </div>
            </div>

            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter your Gmail address:
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGooglePromptOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !googleEmail.trim()}
                  className="px-4 py-2 glow-btn text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {submitting ? t('loading') : t('continueWithGoogle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
