import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Database,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { useAuth, AuthModalMode } from '../../context/AuthContext';
import { AVAILABLE_INTERESTS, InterestCategory } from '../../services/profile/profileService';

export const AuthModal: React.FC = () => {
  const {
    user,
    profile,
    displayName: currentDisplayName,
    avatarUrl,
    isAuthenticated,
    authModalOpen,
    authModalMode,
    closeAuthModal,
    setAuthModalMode,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    updateProfile,
  } = useAuth();

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile editing states
  const [preferredName, setPreferredName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // Email update states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // SQL migration modal toggle
  const [showSqlMigration, setShowSqlMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (profile) {
      setPreferredName(profile.display_name || '');
      setSelectedInterests(profile.interests || []);
    } else if (user) {
      const initial = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : '');
      setPreferredName(initial);
      setSelectedInterests([]);
    }
  }, [profile, user, authModalMode]);

  if (!authModalOpen) return null;

  const resetFormState = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setProfileErrorMessage(null);
    setProfileSuccessMessage(null);
    setShowEmailChange(false);
    setNewEmailInput('');
  };

  const handleSwitchMode = (mode: AuthModalMode) => {
    resetFormState();
    setAuthModalMode(mode);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await signUpWithEmail(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.requiresEmailVerification) {
        setSuccessMessage(
          `Confirmation email sent to ${email}. Please check your inbox or spam folder to verify your account.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMessage(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await resetPassword(email);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(`Password reset link sent to ${email}. Check your email to set a new password.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await updatePassword(password);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage('Password successfully updated! You are now logged in.');
      }
    } finally {
      setLoading(false);
    }
  };

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
      setProfileSuccessMessage('Profile updated successfully.');
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

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput.trim()) {
      setProfileErrorMessage('Please enter a valid new email address.');
      return;
    }
    setUpdatingEmail(true);
    setProfileErrorMessage(null);
    try {
      const res = await updateEmail(newEmailInput.trim());
      if (res.error) {
        setProfileErrorMessage(res.error);
      } else {
        setProfileSuccessMessage(
          `Confirmation email sent to ${newEmailInput}. Please check both inboxes to confirm the change.`
        );
        setShowEmailChange(false);
        setNewEmailInput('');
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleCopySql = () => {
    const sql = `-- Openquire: Supabase Tables & RLS Migration
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'web',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  model_id TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  provider_id TEXT NOT NULL DEFAULT 'gemini',
  initial_query TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}'::text[],
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const userInitials = preferredName
    ? preferredName.substring(0, 2).toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'OP';

  const providerName = user?.app_metadata?.provider || 'email';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#F0F1EA] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#191919]">
              {authModalMode === 'profile'
                ? 'Profile & Account Settings'
                : authModalMode === 'sign_up'
                ? 'Create Openquire Account'
                : authModalMode === 'reset_password'
                ? 'Reset Password'
                : authModalMode === 'update_password'
                ? 'Set New Password'
                : 'Sign In to Openquire'}
            </h3>
            <p className="text-xs text-[#717171] mt-0.5">
              {authModalMode === 'profile'
                ? 'Manage your preferred name, research interests, and session'
                : 'Synchronize research history and evidence cross-device'}
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Feedback banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* ========================================================================= */}
          {/* PROFILE & SETTINGS MODE */}
          {/* ========================================================================= */}
          {authModalMode === 'profile' && isAuthenticated && user && (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#F8F9F5] border border-[#E8E8E5]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={currentDisplayName}
                    className="w-12 h-12 rounded-full object-cover border border-[#C2C9B3] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#B8F36B] text-[#102000] font-bold text-sm flex items-center justify-center shrink-0 border border-[#A7EB50]">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#191919] truncate">{currentDisplayName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E0E5D3] text-[#416900] uppercase font-semibold">
                      {providerName}
                    </span>
                  </div>
                  <p className="text-xs text-[#717171] truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Profile Feedback */}
              {profileErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileErrorMessage}</span>
                </div>
              )}

              {profileSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccessMessage}</span>
                </div>
              )}

              {/* Profile Form: Preferred Name & Interests */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Field 1: Preferred Display Name */}
                <div className="space-y-1.5">
                  <label htmlFor="settings-preferred-name" className="block text-xs font-semibold text-[#191919]">
                    Preferred Name
                  </label>
                  <div className="relative">
                    <input
                      id="settings-preferred-name"
                      type="text"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      placeholder="e.g. Eleanor, Dr. Smith, Alex"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                  <p className="text-[11px] text-[#717171]">
                    What you prefer Openquire to call you in the workspace and exported research notes.
                  </p>
                </div>

                {/* Field 2: Research Interests */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#191919]">
                      Research Interests
                    </label>
                    <span className="text-[11px] text-[#717171]">
                      {selectedInterests.length} selected
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717171] leading-relaxed">
                    Personalize your suggested exploration topics. Searches and models remain fully unrestricted.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {AVAILABLE_INTERESTS.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#181D13] text-[#B8F36B] shadow-2xs'
                              : 'bg-[#F2F3EE] hover:bg-[#EAEBE4] text-[#434938] border border-[#E0E2D8]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          <span>{interest}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save Profile Button */}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Preferences...</span>
                    </>
                  ) : (
                    <span>Save Profile Preferences</span>
                  )}
                </button>
              </form>

              {/* Account Identity & Email Section */}
              <div className="pt-4 border-t border-[#E8E8E5] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#191919]">Account Email</p>
                    <p className="text-xs font-mono text-[#717171]">{user.email}</p>
                  </div>
                  {providerName === 'email' && (
                    <button
                      type="button"
                      onClick={() => setShowEmailChange(!showEmailChange)}
                      className="text-xs text-[#416900] hover:underline font-medium cursor-pointer"
                    >
                      {showEmailChange ? 'Cancel' : 'Change Email'}
                    </button>
                  )}
                </div>

                {showEmailChange && (
                  <form onSubmit={handleUpdateEmail} className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E8E8E5] space-y-3">
                    <p className="text-[11px] text-[#555] leading-relaxed">
                      Enter your new email address. Supabase Auth will send confirmation links to both addresses to verify ownership.
                    </p>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={newEmailInput}
                        onChange={(e) => setNewEmailInput(e.target.value)}
                        placeholder="new-address@example.com"
                        className="w-full bg-white border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={updatingEmail}
                      className="w-full bg-[#181D13] hover:bg-[#252c1e] text-white font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {updatingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Request Email Change</span>}
                    </button>
                  </form>
                )}
              </div>

              {/* Supabase PostgreSQL & RLS Status */}
              <div className="rounded-xl border border-[#E8E8E5] p-3.5 space-y-2 text-xs bg-[#FAFBF8]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[#191919]">
                    <ShieldCheck className="w-4 h-4 text-[#416900]" />
                    <span>PostgreSQL Row-Level Security</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Enforced
                  </span>
                </div>
                <p className="text-[#555] text-[11px] leading-relaxed">
                  Your research history and profile are strictly bound to your Supabase UUID (<code className="bg-[#EAEBE4] px-1 py-0.5 rounded text-[10px]">{user.id.substring(0, 8)}...</code>). Cross-user access is blocked at the database engine level.
                </p>
                <div className="pt-2 border-t border-[#F0F1EA] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#717171]">
                    <Database className="w-3.5 h-3.5" />
                    <span>SQL Migrations:</span>
                  </div>
                  <button
                    onClick={() => setShowSqlMigration(!showSqlMigration)}
                    className="text-[11px] text-[#416900] hover:underline font-medium cursor-pointer"
                  >
                    {showSqlMigration ? 'Hide SQL Script' : 'View SQL Migration'}
                  </button>
                </div>

                {showSqlMigration && (
                  <div className="mt-2 p-2.5 rounded bg-[#191919] text-[#E0E5D3] font-mono text-[10px] relative max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="absolute top-2 right-2 p-1 rounded bg-[#333] hover:bg-[#444] text-white flex items-center gap-1 cursor-pointer"
                      title="Copy SQL"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                    </button>
                    <p className="text-zinc-400 pb-1">-- Copy and run in Supabase SQL editor if needed:</p>
                    <p className="text-emerald-400">CREATE TABLE public.conversations (...);</p>
                    <p className="text-emerald-400">CREATE TABLE public.profiles (...);</p>
                    <p className="text-emerald-400">ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Openquire</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SIGN IN MODE */}
          {/* ========================================================================= */}
          {authModalMode === 'sign_in' && (
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#E8E8E5] hover:bg-[#F9F9F7] text-[#191919] font-medium text-xs shadow-2xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E8E8E5]" />
                <span className="text-[11px] text-[#717171] uppercase tracking-wider">or email</span>
                <div className="h-px flex-1 bg-[#E8E8E5]" />
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#434938]">Password</label>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('reset_password')}
                      className="text-[11px] text-[#416900] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
                </button>
              </form>

              <div className="text-center pt-2 text-xs text-[#717171]">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('sign_up')}
                  className="text-[#416900] font-semibold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SIGN UP MODE */}
          {/* ========================================================================= */}
          {authModalMode === 'sign_up' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#E8E8E5] hover:bg-[#F9F9F7] text-[#191919] font-medium text-xs shadow-2xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Sign up with Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E8E8E5]" />
                <span className="text-[11px] text-[#717171] uppercase tracking-wider">or email</span>
                <div className="h-px flex-1 bg-[#E8E8E5]" />
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Confirm password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
                </button>
              </form>

              <div className="text-center pt-2 text-xs text-[#717171]">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('sign_in')}
                  className="text-[#416900] font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RESET PASSWORD MODE */}
          {/* ========================================================================= */}
          {authModalMode === 'reset_password' && (
            <div className="space-y-4">
              <p className="text-xs text-[#555] leading-relaxed">
                Enter your registered email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Instructions</span>}
                </button>
              </form>

              <div className="text-center pt-2 text-xs text-[#717171]">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('sign_in')}
                  className="text-[#416900] font-semibold hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* UPDATE PASSWORD MODE */}
          {/* ========================================================================= */}
          {authModalMode === 'update_password' && (
            <div className="space-y-4">
              <p className="text-xs text-[#555] leading-relaxed">
                Enter your new secure password below to complete recovery.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#434938] mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#717171] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
