import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { X, Copy, Check, Users, RefreshCw, LogIn, Pencil, Plus, ArrowRightLeft, LogOut } from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const {
    group,
    groups,
    members,
    user,
    refreshGroup,
    switchGroup,
    createGroup,
    joinGroup,
    leaveGroup,
    updateGroupName,
    updateUserName,
  } = useAuth();
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [savingUserName, setSavingUserName] = useState(false);
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingNewGroup, setCreatingNewGroup] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const displayGroups =
    groups && groups.length > 0
      ? groups
      : group
      ? [
          {
            group_id: group.id,
            name: group.name,
            invite_code: group.invite_code,
            role: user?.role || 'member',
            joined_at: group.created_at,
          },
        ]
      : [];

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

  const handleStartEditingName = () => {
    setEditedName(group.name);
    setIsEditingName(true);
  };

  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === group.name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      await updateGroupName(trimmed);
      setIsEditingName(false);
      onShowToast(t('toastGroupNameUpdated'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to update group name', 'error');
    } finally {
      setSavingName(false);
    }
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

  const handleSwitch = async (targetId: string) => {
    if (targetId === group.id) return;
    setSwitchingId(targetId);
    try {
      await switchGroup(targetId);
      onShowToast(t('toastSwitchedGroup'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to switch group', 'error');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setCreatingNewGroup(true);
    try {
      await createGroup(trimmed);
      onShowToast(t('toastGroupCreated'), 'success');
      setNewGroupName('');
      setIsCreatingNewGroup(false);
    } catch (e: any) {
      onShowToast(e.message || 'Failed to create group', 'error');
    } finally {
      setCreatingNewGroup(false);
    }
  };

  const handleLeave = async () => {
    if (displayGroups.length <= 1) return;
    if (!window.confirm(t('leaveGroupConfirm'))) return;
    setLeaving(true);
    try {
      await leaveGroup(group.id);
      onShowToast(t('toastLeftGroup'), 'info');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to leave group', 'error');
    } finally {
      setLeaving(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    try {
      await joinGroup(joinCode.trim().toUpperCase());
      setJoinCode('');
      onShowToast(t('toastJoinedGroup'), 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Failed to join group', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900/95 backdrop-blur-2xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/15 relative max-h-[90vh] overflow-y-auto text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <form onSubmit={handleSaveGroupName} className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder={t('groupNamePlaceholder')}
                  autoFocus
                  maxLength={50}
                  className="w-full px-2.5 py-1 text-sm font-bold text-white border border-sky-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-900"
                  disabled={savingName}
                />
                <button
                  type="submit"
                  disabled={savingName || !editedName.trim()}
                  title={t('save')}
                  className="p-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                >
                  {savingName ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditingName}
                  disabled={savingName}
                  title={t('cancel')}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-black text-white truncate" title={group.name}>
                  {group.name}
                </h3>
                {user?.role === 'admin' && (
                  <button
                    onClick={handleStartEditingName}
                    title={t('editGroupName')}
                    className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {t('membersConnected', { count: members.length })}
            </p>
          </div>
        </div>

        {/* Invite Code Box */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-white/12 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {t('familyInviteCode')}
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                title="Regenerate code"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{t('newCode')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-black tracking-widest text-sky-300 bg-black/60 px-3 py-1.5 rounded-lg border border-white/20 flex-1 text-center">
              {group.invite_code}
            </span>
            <button
              onClick={handleCopyCode}
              title={t('copyCode')}
              className="p-2.5 bg-white/10 border border-white/15 hover:bg-white/15 text-slate-100 rounded-lg transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full mt-3 py-2 px-3 bg-white/10 border border-white/15 hover:bg-white/15 text-sky-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? t('linkCopied') : t('copyShareLink')}</span>
          </button>
        </div>

        {/* Members List */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            {t('members')}
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/10"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-xl shrink-0">{member.avatar_url || '👤'}</span>
                  <div className="flex-1 min-w-0">
                    {isEditingUserName && member.id === user?.id ? (
                      <form onSubmit={handleSaveUserName} className="flex items-center gap-1.5 my-0.5">
                        <input
                          type="text"
                          value={editedUserName}
                          onChange={(e) => setEditedUserName(e.target.value)}
                          placeholder={t('namePlaceholder')}
                          autoFocus
                          maxLength={40}
                          className="w-full max-w-[170px] px-2 py-0.5 text-xs font-bold text-white border border-sky-400/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400 bg-slate-900"
                          disabled={savingUserName}
                        />
                        <button
                          type="submit"
                          disabled={savingUserName || !editedUserName.trim()}
                          title={t('save')}
                          className="p-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                        >
                          {savingUserName ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditingUserName}
                          disabled={savingUserName}
                          title={t('cancel')}
                          className="p-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white flex items-center gap-1 truncate">
                          {member.name}
                          {member.id === user?.id && (
                            <span className="text-[10px] bg-sky-500/25 text-sky-200 font-bold px-1.5 py-0.2 rounded shrink-0 border border-sky-400/40">
                              {t('you')}
                            </span>
                          )}
                        </p>
                        {member.id === user?.id && (
                          <button
                            onClick={handleStartEditingUserName}
                            title={t('editUserName')}
                            className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-300 font-medium truncate">{member.email}</p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                    member.role === 'admin'
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                      : 'bg-white/10 text-slate-200 border-white/15'
                  }`}
                >
                  {member.role === 'admin' ? t('adminRole') : t('memberRole')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* My Groups & Switching */}
        <div className="pt-4 border-t border-white/12 mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              {t('myGroups')}
            </h4>
            {!isCreatingNewGroup && (
              <button
                onClick={() => setIsCreatingNewGroup(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('createNewGroup')}</span>
              </button>
            )}
          </div>

          {/* List of groups */}
          <div className="space-y-2 mb-3">
            {displayGroups.map((g) => {
              const isActive = g.group_id === group.id;
              const isSwitching = switchingId === g.group_id;
              return (
                <div
                  key={g.group_id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-400/40 shadow-sm shadow-sky-500/10'
                      : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate">{g.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0 border ${
                        g.role === 'admin'
                          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                          : 'bg-white/10 text-slate-300 border-white/15'
                      }`}
                    >
                      {g.role === 'admin' ? t('adminRole') : t('memberRole')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <>
                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1 px-2 py-1">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        {displayGroups.length > 1 && (
                          <button
                            onClick={handleLeave}
                            disabled={leaving}
                            title={t('leaveGroup')}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/30 text-xs font-semibold flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('leaveGroup')}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleSwitch(g.group_id)}
                        disabled={isSwitching}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isSwitching ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                        ) : (
                          <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                        )}
                        <span>{t('switchGroup')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Create Group Form */}
          {isCreatingNewGroup && (
            <form onSubmit={handleCreateGroup} className="p-3 bg-slate-950/70 border border-sky-400/40 rounded-xl space-y-2.5 mb-3">
              <span className="text-xs font-bold text-white block">{t('createNewGroup')}</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t('newGroupName')}
                  maxLength={50}
                  autoFocus
                  disabled={creatingNewGroup}
                  className="px-3 py-1.5 bg-slate-900 border border-white/20 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400 flex-1"
                />
                <button
                  type="submit"
                  disabled={creatingNewGroup || !newGroupName.trim()}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {creatingNewGroup && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{t('create')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewGroup(false);
                    setNewGroupName('');
                  }}
                  disabled={creatingNewGroup}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Join Another Group */}
        <form onSubmit={handleJoin} className="pt-4 border-t border-white/12">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {t('joinAnotherGroup')}
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('enterCodePlaceholder')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="px-3 py-2 bg-slate-950/70 border border-white/20 text-white placeholder-slate-400 rounded-xl text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 flex-1 transition-all"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="px-4 py-2 glow-btn text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
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
