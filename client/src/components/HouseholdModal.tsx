import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { X, Copy, Check, Users, RefreshCw, LogIn } from 'lucide-react';

interface HouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HouseholdModal: React.FC<HouseholdModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { group, members, user, refreshGroup } = useAuth();
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!isOpen || !group) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    onShowToast(t('toastCodeCopied'), 'success');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?join=${group.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    onShowToast(t('toastLinkCopied'), 'success');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.groups.regenerateInvite();
      await refreshGroup();
      onShowToast(t('toastTaskUpdated'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to regenerate code', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    try {
      await api.groups.join(joinCode.trim().toUpperCase());
      await refreshGroup();
      setJoinCode('');
      onShowToast(t('toastJoinedGroup'), 'success');
      onClose();
    } catch (e: any) {
      onShowToast(e.message || 'Failed to join group', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
            <p className="text-xs text-slate-500">
              {t('membersConnected', { count: members.length })}
            </p>
          </div>
        </div>

        {/* Invite Code Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('familyInviteCode')}
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                title="Regenerate code"
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{t('newCode')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold tracking-widest text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex-1 text-center">
              {group.invite_code}
            </span>
            <button
              onClick={handleCopyCode}
              title={t('copyCode')}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full mt-3 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? t('linkCopied') : t('copyShareLink')}</span>
          </button>
        </div>

        {/* Members List */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            {t('members')}
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{member.avatar_url || '👤'}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                      {member.name}
                      {member.id === user?.id && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                          {t('you')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    member.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {member.role === 'admin' ? t('adminRole') : t('memberRole')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Join Another Group */}
        <form onSubmit={handleJoin} className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('joinAnotherHousehold')}
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('enterCodePlaceholder')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{joining ? t('joining') : t('join')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
