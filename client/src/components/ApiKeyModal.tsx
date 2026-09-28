import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import type { ApiKey } from '../types';
import {
  X,
  Key,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Plus,
  Terminal,
  ShieldAlert,
  Bot,
} from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { t, language } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCurlSnippet, setShowCurlSnippet] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      setNewlyCreatedKey(null);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating && !revokingId) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, generating, revokingId]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await api.apiKeys.list();
      setKeys(res.api_keys || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyName.trim();
    setGenerating(true);
    try {
      const res = await api.apiKeys.create({ name: trimmed || 'AI Agent' });
      setNewlyCreatedKey(res.key);
      setKeyName('');
      setKeys((prev) => [res.api_key, ...prev]);
      onShowToast(t('toastKeyCreated'), 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to generate API key', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    onShowToast(t('keyCopied'), 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm(t('revokeKeyConfirm'))) {
      return;
    }
    setRevokingId(id);
    try {
      await api.apiKeys.revoke(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      onShowToast(t('toastKeyRevoked'), 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to revoke API key', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generating && !revokingId) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/15 relative text-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 id="api-key-modal-title" className="text-base font-bold text-white">
                {t('apiKeysTitle')}
              </h2>
              <p className="text-xs text-slate-400">{t('apiKeysDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating || !!revokingId}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Newly Generated Key Alert */}
          {newlyCreatedKey && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-amber-300 block">{t('keyCreatedTitle')}</span>
                  <p className="text-amber-200/90 leading-relaxed">{t('keyCopyWarning')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-950/70 rounded-xl border border-amber-400/30">
                <code className="text-xs font-mono text-amber-300 flex-1 truncate select-all px-1">
                  {newlyCreatedKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('keyCopied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('copyKey')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Create Key Form */}
          <form onSubmit={handleGenerate} className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('createApiKey')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder={t('keyNamePlaceholder')}
                maxLength={50}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors"
                disabled={generating}
              />
              <button
                type="submit"
                disabled={generating}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-sky-500/20 active:scale-95"
              >
                {generating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{t('generateKeyBtn')}</span>
              </button>
            </div>
          </form>

          {/* Existing Keys List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-300">
              {t('apiKeysTitle')} ({keys.length})
            </h3>

            {loading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>{t('loading')}</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 space-y-1">
                <Key className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                <p>{t('noApiKeys')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-xs font-bold text-white truncate">{k.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300">
                          {k.key_prefix}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {t('createdOn')}: {formatDate(k.created_at)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {t('lastUsed')}:{' '}
                          {k.last_used_at ? formatDate(k.last_used_at) : t('neverUsed')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      title={t('revokeKey')}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      {revokingId === k.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Agent integration tip */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowCurlSnippet(!showCurlSnippet)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>
                {showCurlSnippet ? 'Hide AI Agent request example' : 'How to use with your AI Agent / curl'}
              </span>
            </button>

            {showCurlSnippet && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs font-mono text-slate-300">
                <p className="text-[11px] text-slate-400 font-sans">
                  Include your key in the standard <code>Authorization</code> header:
                </p>
                <div className="p-2 bg-black/40 rounded-lg select-all overflow-x-auto text-[11px] text-sky-300">
                  curl -X GET &quot;{window.location.origin}/api/tasks&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Authorization: Bearer tick_live_YOUR_KEY&quot;
                </div>
                <p className="text-[11px] text-slate-400 font-sans pt-1">
                  Create a chore or task:
                </p>
                <div className="p-2 bg-black/40 rounded-lg select-all overflow-x-auto text-[11px] text-emerald-300">
                  curl -X POST &quot;{window.location.origin}/api/tasks&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Authorization: Bearer tick_live_YOUR_KEY&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                  &nbsp;&nbsp;-d &apos;{JSON.stringify({ title: 'Take out trash', priority: 'medium' })}&apos;
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
