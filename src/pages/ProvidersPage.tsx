import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Key,
  ExternalLink,
  Lock,
  AlertTriangle,
  RotateCw,
  Trash2,
  Cpu,
  Database,
  Sparkles,
  HelpCircle,
  RefreshCw,
  User as UserIcon,
  Mail,
  LogOut,
  Check,
  Loader2,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import { useBYOK } from '../hooks/useBYOK';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_INTERESTS, InterestCategory } from '../services/profile/profileService';
import { openAiPlannedAdapter, anthropicPlannedAdapter, openRouterPlannedAdapter } from '../services/providers/plannedAdapters';

export const ProvidersPage: React.FC = () => {
  // Real Google Gemini BYOK hook
  const gemini = useBYOK('gemini');

  // Local UI states for key entry and modals
  const [inputKey, setInputKey] = useState('');
  const [showInputKey, setShowInputKey] = useState(false);
  const [showStoredKey, setShowStoredKey] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Planned provider drawers state
  const [plannedNotice, setPlannedNotice] = useState<string | null>(null);

  const handleValidateAndConnect = async () => {
    if (!inputKey.trim()) return;
    const success = await gemini.validateAndSaveKey(inputKey);
    if (success) {
      setInputKey('');
      setIsReplacing(false);
    }
  };

  const handleConfirmRemove = async () => {
    await gemini.removeKey();
    setShowRemoveConfirm(false);
    setIsReplacing(false);
    setInputKey('');
  };

  const [settingsTab, setSettingsTab] = useState<'providers' | 'profile'>('providers');

  // Supabase Auth and User Profile
  const {
    user,
    profile,
    displayName,
    avatarUrl,
    isAuthenticated,
    openAuthModal,
    signOut,
    updateProfile,
  } = useAuth();

  const [preferredName, setPreferredName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setPreferredName(profile.display_name || '');
      setSelectedInterests(profile.interests || []);
    } else if (user) {
      const initial = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : '');
      setPreferredName(initial);
      setSelectedInterests([]);
    }
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrorMessage(null);
    setProfileSuccessMessage(null);
    try {
      await updateProfile({
        display_name: preferredName.trim() || null,
        interests: selectedInterests,
      });
      setProfileSuccessMessage('Profile settings saved successfully.');
      setTimeout(() => setProfileSuccessMessage(null), 3000);
    } catch (err: any) {
      setProfileErrorMessage(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleInterest = (interest: InterestCategory) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6 min-w-0">
      {/* Top Metadata / Breadcrumb & Title */}
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-[#717171] dark:text-[#9EA396] flex-wrap">
          <span>Settings</span>
          <span className="text-[#DFE0DC] dark:text-[#2C3125]">/</span>
          <span className="text-[#191919] dark:text-[#ECEEE6] font-medium truncate">
            {settingsTab === 'providers' ? 'AI Providers & BYOK Vault' : 'User Profile & Cloud Sync'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#191919] dark:text-[#ECEEE6] tracking-tight break-words">
              {settingsTab === 'providers' ? 'AI Providers & BYOK Vault' : 'User Profile & Cloud Settings'}
            </h1>
            <p className="text-xs sm:text-sm text-[#717171] dark:text-[#9EA396] mt-0.5 leading-relaxed">
              {settingsTab === 'providers'
                ? 'Connect your own AI provider keys. Your keys are verified live and stored strictly in your browser.'
                : 'Manage your preferred name, research interests, and Supabase cloud persistence.'}
            </p>
          </div>
          {settingsTab === 'providers' ? (
            <div className="flex items-center gap-2 text-xs font-mono bg-[#E0E5D3] dark:bg-[#20251A] text-[#181D13] dark:text-[#B8F36B] px-3 py-1.5 rounded-full self-start sm:self-auto border border-[#C2C9B3] dark:border-[#2C3125] shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  gemini.status === 'connected' ? 'bg-[#416900] dark:bg-[#B8F36B] animate-pulse' : 'bg-[#9E9E99] dark:bg-[#6C7262]'
                }`}
              />
              <span className="font-semibold">
                {gemini.status === 'connected' ? 'BYOK Active: Google Gemini' : 'BYOK Awaiting Key'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono bg-[#E0E5D3] dark:bg-[#20251A] text-[#181D13] dark:text-[#B8F36B] px-3 py-1.5 rounded-full self-start sm:self-auto border border-[#C2C9B3] dark:border-[#2C3125] shrink-0">
              <Cloud className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B]" />
              <span className="font-semibold">
                {isAuthenticated ? 'Cloud Synced (PostgreSQL RLS)' : 'Local Storage Mode'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs (Scrollable on small viewports) */}
      <div className="flex items-center gap-2 border-b border-[#E8E8E5] dark:border-[#242A1D] pb-2 overflow-x-auto max-w-full scrollbar-none">
        <button
          type="button"
          onClick={() => setSettingsTab('providers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            settingsTab === 'providers'
              ? 'bg-[#181D13] dark:bg-[#B8F36B] text-[#B8F36B] dark:text-[#102000] shadow-2xs'
              : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Providers & BYOK Vault</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            settingsTab === 'profile'
              ? 'bg-[#181D13] dark:bg-[#B8F36B] text-[#B8F36B] dark:text-[#102000] shadow-2xs'
              : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A]'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>User Profile & Cloud Sync</span>
        </button>
      </div>

      {settingsTab === 'profile' ? (
        <div className="space-y-6">
          {isAuthenticated && user ? (
            <div className="bg-white dark:bg-[#151711] rounded-2xl p-6 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-6">
              {/* User Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5] dark:border-[#242A1D]">
                <div className="flex items-center gap-3.5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover border border-[#C2C9B3] dark:border-[#2C3125] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#B8F36B] text-[#102000] font-bold text-sm flex items-center justify-center shrink-0 border border-[#A7EB50]">
                      {displayName ? displayName.substring(0, 2).toUpperCase() : 'OP'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">{displayName}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E0E5D3] dark:bg-[#20251A] text-[#416900] dark:text-[#B8F36B] uppercase font-semibold">
                        {user.app_metadata?.provider || 'Email'}
                      </span>
                    </div>
                    <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-0.5">{user.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Feedback messages */}
              {profileErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileErrorMessage}</span>
                </div>
              )}
              {profileSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccessMessage}</span>
                </div>
              )}

              {/* Edit form */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="pref-name" className="block text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">
                    Preferred Name
                  </label>
                  <input
                    id="pref-name"
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="Your preferred name"
                    className="w-full max-w-md bg-[#FBFBFA] dark:bg-[#151812] border border-[#E8E8E5] dark:border-[#242A1D] rounded-xl px-3.5 py-2.5 text-xs text-[#191919] dark:text-[#ECEEE6] placeholder:text-[#999] dark:placeholder:text-[#646A5B] focus:outline-none focus:border-[#416900] dark:focus:border-[#B8F36B] focus:ring-1 focus:ring-[#416900] dark:focus:ring-[#B8F36B]"
                  />
                  <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">
                    What Openquire calls you in research reports and workspace views.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between max-w-md">
                    <label className="block text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">
                      Research Interests
                    </label>
                    <span className="text-[11px] text-[#717171] dark:text-[#9EA396]">{selectedInterests.length} selected</span>
                  </div>
                  <p className="text-[11px] text-[#717171] dark:text-[#9EA396] leading-relaxed">
                    Personalizes suggested research topics only. Searches, evidence retrieval, and AI models remain fully unrestricted.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {AVAILABLE_INTERESTS.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#181D13] dark:bg-[#B8F36B] text-[#B8F36B] dark:text-[#102000] shadow-2xs font-semibold border border-[#181D13] dark:border-[#B8F36B]'
                              : 'bg-[#F2F3EE] dark:bg-[#1E221A] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#434938] dark:text-[#C5CAB8] border border-[#E0E2D8] dark:border-[#282D22]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          <span>{interest}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </div>
              </form>

              {/* PostgreSQL Row Level Security status card */}
              <div className="rounded-xl border border-[#E8E8E5] dark:border-[#242A1D] p-4 space-y-2 text-xs bg-[#FAFBF8] dark:bg-[#1A1D16]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[#191919] dark:text-[#ECEEE6]">
                    <ShieldCheck className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
                    <span>Supabase Cloud Row-Level Security</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-transparent dark:border-emerald-800/40">
                    RLS Active
                  </span>
                </div>
                <p className="text-[#555] dark:text-[#9EA396] text-[11px] leading-relaxed">
                  Your profile and research history are isolated by your Supabase user ID (<code className="bg-[#EAEBE4] dark:bg-[#20251A] text-[#191919] dark:text-[#ECEEE6] px-1 py-0.5 rounded font-mono text-[10px]">{user.id}</code>). PostgreSQL Row Level Security ensures no other authenticated user can read or modify your data.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#151711] rounded-2xl p-8 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#E0E5D3] dark:bg-[#20251A] text-[#434938] dark:text-[#B8F36B] flex items-center justify-center mx-auto">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#191919] dark:text-[#ECEEE6]">Sign in to Openquire</h2>
                <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-1">
                  Connect with Email or Google to personalize your profile, customize research interests, and synchronize history cross-device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('sign_in')}
                className="bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <span>Sign In or Register</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">

      {/* Security Boundaries & Architecture Disclosure */}
      <div className="relative overflow-hidden bg-white dark:bg-[#151711] rounded-2xl p-4 sm:p-5 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-2 w-full min-w-0 box-border">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#B8F36B]" />
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] flex items-center justify-center shrink-0 text-[#181D13] dark:text-[#D6FF8E] mt-0.5">
            <Shield className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="space-y-1.5 pr-2 min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
              Client-Side BYOK Security Model
            </h2>
            <p className="text-xs text-[#434938] dark:text-[#A8AE9E] leading-relaxed">
              API keys are stored exclusively in your browser’s local <strong>IndexedDB</strong> storage. Openquire never transmits your keys to our servers, Supabase, or any centralized database.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Zero server persistence
              </span>
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Direct browser CORS authentication
              </span>
              <span className="flex items-center gap-1 text-[#717171] dark:text-[#9EA396]">
                <Lock className="w-3.5 h-3.5" /> Sandboxed per origin
              </span>
            </div>
            <p className="text-[11px] text-[#9E9E99] dark:text-[#6C7262] pt-1">
              <strong>Security boundary:</strong> Browser storage protects credentials from server breaches, but does not protect against physical machine compromise or unverified browser extensions.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Cards Container */}
      <div className="space-y-4 w-full min-w-0 box-border">
        {/* ============================================================ */}
        {/* 1. GOOGLE GEMINI (ACTIVE) */}
        {/* ============================================================ */}
        <article className="w-full min-w-0 box-border bg-white dark:bg-[#151711] rounded-2xl p-4 sm:p-6 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-4 hover:shadow-md transition-all">
          <div className="flex flex-col gap-4 w-full min-w-0">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#F6F3F2] dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] flex items-center justify-center shrink-0 font-bold text-xs text-[#191919] dark:text-[#ECEEE6]">
                  <Sparkles className="w-6 h-6 text-[#416900] dark:text-[#B8F36B]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">
                      {gemini.adapter.metadata.name}
                    </h3>
                    {gemini.status === 'connected' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#416900] dark:bg-[#B8F36B]" />
                        <span>Connected & Verified</span>
                      </span>
                    )}
                    {gemini.status === 'validating' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 text-xs font-semibold">
                        <RotateCw className="w-3 h-3 animate-spin" />
                        <span>Validating with Google...</span>
                      </span>
                    )}
                    {gemini.status === 'error' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 text-xs font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Validation Failed</span>
                      </span>
                    )}
                    {gemini.status === 'not_configured' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F2ED] dark:bg-[#20251A] text-[#717171] dark:text-[#9EA396] text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9E9E99]" />
                        <span>Not configured</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-0.5">
                    {gemini.adapter.metadata.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <a
                  href={gemini.adapter.metadata.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] bg-[#F6F3F2] dark:bg-[#1E221A] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium rounded-xl border border-[#E8E8E5] dark:border-[#2C3125] transition-colors cursor-pointer"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* ERROR BANNER IF PRESENT */}
            {gemini.error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-1.5 text-xs text-red-800 dark:text-red-300 animate-in fade-in duration-200 w-full min-w-0 box-border">
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>
                      {gemini.error.code}: {gemini.error.message}
                    </span>
                  </div>
                  <button
                    onClick={gemini.clearError}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {gemini.error.details && (
                  <p className="text-[11px] text-red-700 dark:text-red-300/80 pl-5 leading-relaxed">
                    {gemini.error.details}
                  </p>
                )}
                <p className="text-[11px] font-medium text-red-900 dark:text-red-200 pl-5">
                  <strong>Action:</strong> {gemini.error.suggestedAction}
                </p>
              </div>
            )}

            {/* KEY CONFIGURATION AREA */}
            <div className="pt-1 space-y-3 w-full min-w-0">
              {/* STATE A: CONNECTED & VALIDATED */}
              {gemini.status === 'connected' && !isReplacing && (
                <div className="w-full min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)_auto] gap-3 items-end w-full min-w-0">
                    {/* 1. API Key Field (Largest share of available width) */}
                    <div className="space-y-1 min-w-0 md:col-span-2 lg:col-span-1">
                      <label className="text-xs font-medium text-[#717171] dark:text-[#9EA396] block truncate">
                        Saved Gemini API Key (IndexedDB Sandboxed)
                      </label>
                      <div className="relative flex items-center w-full min-w-0">
                        <input
                          type={showStoredKey ? 'text' : 'password'}
                          value={gemini.maskedKey}
                          readOnly
                          className="w-full min-w-0 bg-[#F6F3F2] dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] px-3 py-2 pr-10 min-h-[40px] rounded-xl font-mono text-xs text-[#191919] dark:text-[#ECEEE6] focus:outline-none"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowStoredKey(!showStoredKey)}
                            className="p-1 text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] rounded-md transition-colors cursor-pointer"
                            title={showStoredKey ? 'Hide key preview' : 'Show key preview'}
                            aria-label={showStoredKey ? 'Hide key preview' : 'Show key preview'}
                          >
                            {showStoredKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Synthesis Model Selector (Sufficient width for selected value) */}
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-medium text-[#717171] dark:text-[#9EA396] block truncate">
                        Synthesis Model
                      </label>
                      <select
                        value={gemini.selectedModel || ''}
                        onChange={(e) => gemini.selectModel(e.target.value)}
                        className="w-full min-w-0 bg-[#F6F3F2] dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] px-3 py-2 min-h-[40px] rounded-xl text-xs text-[#191919] dark:text-[#ECEEE6] font-medium focus:outline-none cursor-pointer truncate"
                      >
                        {gemini.availableModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.isRecommended ? '(Recommended)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Action Buttons (Replace & Delete) */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5 md:pt-0">
                      <button
                        type="button"
                        onClick={() => setIsReplacing(true)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#191C15] hover:bg-[#F1F2ED] dark:hover:bg-[#20251A] text-[#191919] dark:text-[#ECEEE6] text-xs font-semibold border border-[#E8E8E5] dark:border-[#282D22] transition-colors shrink-0 cursor-pointer shadow-2xs whitespace-nowrap text-center"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRemoveConfirm(true)}
                        className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-semibold border border-red-200 dark:border-red-900/60 transition-colors shrink-0 cursor-pointer"
                        title="Remove key from browser"
                        aria-label="Remove key from browser"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE B: KEY ENTRY OR REPLACEMENT */}
              {(gemini.status !== 'connected' || isReplacing) && (
                <div className="space-y-3 w-full min-w-0">
                  <div className="space-y-1 w-full min-w-0">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                      <label className="font-medium text-[#717171] dark:text-[#9EA396]">
                        {isReplacing ? 'Enter Replacement Gemini API Key' : 'Enter Your Google Gemini API Key'}
                      </label>
                      <span className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
                        Begins with "AIzaSy..."
                      </span>
                    </div>

                    <div className="relative flex items-center w-full min-w-0">
                      <input
                        type={showInputKey ? 'text' : 'password'}
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="AIzaSy..."
                        disabled={gemini.status === 'validating'}
                        className="w-full min-w-0 bg-[#F6F3F2] dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] px-3 py-2.5 pr-20 min-h-[44px] rounded-xl font-mono text-xs text-[#191919] dark:text-[#ECEEE6] focus:outline-none focus:border-[#B8F36B] transition-colors"
                      />
                      <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowInputKey(!showInputKey)}
                          className="w-8 h-8 flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] rounded-lg cursor-pointer"
                          title={showInputKey ? 'Hide key' : 'Show key'}
                          aria-label={showInputKey ? 'Hide key' : 'Show key'}
                        >
                          {showInputKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleValidateAndConnect}
                      disabled={gemini.status === 'validating' || !inputKey.trim()}
                      className="px-4 py-2.5 min-h-[44px] bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      {gemini.status === 'validating' ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validating with Google API...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isReplacing ? 'Validate & Replace' : 'Validate & Connect'}</span>
                        </>
                      )}
                    </button>

                    {isReplacing && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacing(false);
                          setInputKey('');
                        }}
                        className="px-3.5 py-2.5 min-h-[44px] text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] text-xs font-medium cursor-pointer"
                      >
                        Cancel Replacement
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* REMOVAL CONFIRMATION DIALOG */}
              {showRemoveConfirm && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2 animate-in fade-in duration-150 w-full min-w-0 box-border">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Confirm Key Deletion</span>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300/90 leading-relaxed">
                    This will permanently delete your stored Gemini API key from this browser's IndexedDB. Openquire will no longer be able to make research requests with Google Gemini until you re-enter a key.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmRemove}
                      className="px-3.5 py-2 min-h-[38px] bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Confirm Delete Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(false)}
                      className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] text-[#191919] dark:text-[#ECEEE6] rounded-xl text-xs font-medium hover:bg-[#F1F2ED] dark:hover:bg-[#252B1E] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* ============================================================ */}
        {/* 2. UPCOMING INTEGRATIONS: OPENAI, ANTHROPIC, OPENROUTER */}
        {/* ============================================================ */}
        <div className="space-y-3 pt-2 w-full min-w-0 box-border">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717171] dark:text-[#808678]">
              Upcoming Provider Integrations
            </h3>
            <span className="text-[11px] font-mono text-[#9E9E99] dark:text-[#6C7262]">
              Google Gemini is currently active
            </span>
          </div>

          {[openAiPlannedAdapter, anthropicPlannedAdapter, openRouterPlannedAdapter].map((item) => (
            <article
              key={item.metadata.id}
              className="w-full min-w-0 box-border bg-white/80 dark:bg-[#151711] rounded-2xl p-4 sm:p-5 border border-[#E8E8E5] dark:border-[#242A1D] opacity-85 hover:opacity-100 transition-opacity space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F6F3F2] dark:bg-[#1E221A] border border-[#E8E8E5] dark:border-[#2C3125] flex items-center justify-center font-bold text-xs text-[#717171] dark:text-[#9EA396] shrink-0">
                    {item.metadata.name.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-[#191919] dark:text-[#ECEEE6] truncate">{item.metadata.name}</h4>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F2ED] dark:bg-[#20251A] text-[#717171] dark:text-[#9EA396] text-[11px] font-mono shrink-0">
                        <span>In Development</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-0.5 truncate">{item.metadata.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setPlannedNotice(
                        `${item.metadata.name} integration is currently in development. Please configure Google Gemini for active usage.`
                      )
                    }
                    className="px-3 py-1.5 min-h-[36px] rounded-xl bg-[#F6F3F2] dark:bg-[#1E221A] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium border border-[#E8E8E5] dark:border-[#2C3125] transition-colors cursor-pointer"
                  >
                    View Status
                  </button>
                </div>
              </div>

              {plannedNotice && plannedNotice.startsWith(item.metadata.name) && (
                <div className="p-3 bg-[#F6F3F2] dark:bg-[#1E221A] rounded-xl text-xs text-[#434938] dark:text-[#A8AE9E] border border-[#E8E8E5] dark:border-[#2C3125] flex items-start justify-between gap-2 mt-2 w-full min-w-0 box-border">
                  <span className="leading-relaxed flex-1 min-w-0">{plannedNotice}</span>
                  <button
                    onClick={() => setPlannedNotice(null)}
                    className="text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] font-bold shrink-0 p-1 cursor-pointer"
                    aria-label="Close status notice"
                  >
                    ✕
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* Honest Architecture & Security Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 w-full min-w-0 box-border">
        <div className="bg-white dark:bg-[#151711] rounded-2xl p-4 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[#717171] dark:text-[#9EA396]">
            <span className="uppercase tracking-wider">Storage Engine</span>
            <Database className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
          </div>
          <p className="text-sm font-bold text-[#191919] dark:text-[#ECEEE6]">IndexedDB Vault</p>
          <p className="text-[11px] text-[#717171] dark:text-[#9EA396] leading-relaxed">
            Sandboxed to current browser origin. No localStorage plaintext keys.
          </p>
        </div>

        <div className="bg-white dark:bg-[#151711] rounded-2xl p-4 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[#717171] dark:text-[#9EA396]">
            <span className="uppercase tracking-wider">Provider Status</span>
            <Cpu className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
          </div>
          <p className="text-sm font-bold text-[#191919] dark:text-[#ECEEE6]">
            {gemini.status === 'connected' ? 'Google Gemini Live' : 'No Active Key'}
          </p>
          <p className="text-[11px] text-[#717171] dark:text-[#9EA396] leading-relaxed">
            {gemini.status === 'connected'
              ? `Selected: ${gemini.selectedModel || 'None'}`
              : 'Add a Gemini key to activate search synthesis'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#151711] rounded-2xl p-4 border border-[#E8E8E5] dark:border-[#242A1D] shadow-xs space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#717171] dark:text-[#9EA396]">
            <span className="uppercase tracking-wider">Server Privacy</span>
            <Shield className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
          </div>
          <p className="text-sm font-bold text-[#191919] dark:text-[#ECEEE6]">Zero Central Persistence</p>
          <p className="text-[11px] text-[#717171] dark:text-[#9EA396] leading-relaxed">
            Direct browser-to-provider CORS authentication. Keys never touch app servers.
          </p>
        </div>
      </div>

      {/* Footer Support Documentation Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E8E5]/60 dark:border-[#282D22] text-xs text-[#717171] dark:text-[#9EA396]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Need a Google Gemini API Key?</span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#191919] dark:text-[#ECEEE6] underline hover:text-[#416900] dark:hover:text-[#B8F36B] font-medium"
          >
            Create key in Google AI Studio
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#717171] dark:text-[#808678]">Openquire BYOK Architecture v2.0</span>
        </div>
      </div>
    </div>
  )}
</div>
);
};
