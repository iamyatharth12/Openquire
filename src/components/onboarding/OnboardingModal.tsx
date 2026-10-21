import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AVAILABLE_INTERESTS } from '../../services/profile/profileService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingModalContentProps {
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingModalContent: React.FC<OnboardingModalContentProps> = ({
  onClose,
  onComplete,
}) => {
  const { user, profile, updateProfile } = useAuth();

  // Initialize display name from profile, Google user metadata, or email prefix
  const initialName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : '');

  // Initialize interests from profile if already set
  const initialInterests = Array.isArray(profile?.interests) ? profile.interests : [];

  const [displayName, setDisplayName] = useState<string>(initialName);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track if user has explicitly interacted to prevent background sync from overwriting typed input
  const hasUserEditedNameRef = useRef(false);
  const hasUserEditedInterestsRef = useRef(false);

  // If profile data arrives after mount and the field is still empty and unedited, populate it gracefully
  useEffect(() => {
    if (!hasUserEditedNameRef.current && !displayName && profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name, displayName]);

  useEffect(() => {
    if (
      !hasUserEditedInterestsRef.current &&
      selectedInterests.length === 0 &&
      Array.isArray(profile?.interests) &&
      profile.interests.length > 0
    ) {
      setSelectedInterests(profile.interests);
    }
  }, [profile?.interests, selectedInterests.length]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasUserEditedNameRef.current = true;
    setDisplayName(e.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  const toggleInterest = (interest: string) => {
    hasUserEditedInterestsRef.current = true;
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your preferred name to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await updateProfile({
        display_name: trimmedName,
        interests: selectedInterests,
        onboarding_completed: true,
      });
      onComplete();
    } catch (err: any) {
      console.error('[OnboardingModal] Failed to save profile:', err);
      setErrorMessage(
        err?.message || 'Failed to save profile preferences. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter your preferred name.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await updateProfile({
        display_name: trimmedName,
        interests: selectedInterests,
        // Optional interests skipped; preserve required name and complete onboarding
        onboarding_completed: true,
      });
      onComplete();
    } catch (err: any) {
      console.error('[OnboardingModal] Failed to save preferences on skip:', err);
      // Non-blocking fallback to close
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div
        className="bg-white dark:bg-[#161813] rounded-2xl border border-[#E8E8E5] dark:border-[#282D22] shadow-2xl max-w-lg w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92dvh] flex flex-col text-[#191919] dark:text-[#ECEEE6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner with Scholarly Warm Aesthetic */}
        <div className="bg-[#F8F9F5] dark:bg-[#1A1D16] px-4 sm:px-6 pt-5 pb-4 sm:pt-7 sm:pb-5 border-b border-[#E8E8E5] dark:border-[#282D22] shrink-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#434938] dark:text-[#D6FF8E] text-xs font-medium mb-2.5 sm:mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B]" />
            <span>Welcome to Openquire</span>
          </div>
          <h2
            id="onboarding-modal-title"
            className="text-xl sm:text-2xl font-serif font-bold text-[#191919] dark:text-[#ECEEE6] tracking-tight break-words"
          >
            Let's make Openquire yours.
          </h2>
          <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-1 sm:mt-1.5 leading-relaxed">
            Personalize your scholarly research workspace. You can update these preferences anytime from your profile settings.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 shrink-0 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Could not save profile</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleContinue} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Field 1: Preferred Name */}
          <div className="space-y-1.5">
            <label htmlFor="preferred-name-input" className="block text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">
              What should we call you? <span className="text-rose-500">*</span>
            </label>
            <input
              id="preferred-name-input"
              name="displayName"
              type="text"
              required
              autoFocus
              value={displayName}
              onChange={handleNameChange}
              placeholder="Your name"
              disabled={loading}
              className="w-full bg-[#FBFBFA] dark:bg-[#151812] border border-[#E8E8E5] dark:border-[#282D22] rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm text-[#191919] dark:text-[#ECEEE6] placeholder:text-[#999] dark:placeholder:text-[#646A5B] focus:outline-none focus:border-[#416900] dark:focus:border-[#B8F36B] focus:ring-1 focus:ring-[#416900] dark:focus:ring-[#B8F36B] transition-colors disabled:opacity-60"
            />
            <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">
              This is the name displayed on your research exports and workspace.
            </p>
          </div>

          {/* Field 2: Research Interests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">
                What are you interested in?
              </label>
              <span className="text-[11px] text-[#717171] dark:text-[#9EA396]">Optional</span>
            </div>
            <p className="text-[11px] text-[#717171] dark:text-[#9EA396] leading-relaxed">
              Interests personalize suggested research topics only. They never restrict searches, available models, or application functionality.
            </p>

            <div
              className="flex flex-wrap gap-1.5 sm:gap-2 pt-1"
              role="group"
              aria-label="Personal research interests"
            >
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={loading}
                    onClick={() => toggleInterest(interest)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-all cursor-pointer select-none disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-[#181D13] dark:bg-[#B8F36B] text-[#B8F36B] dark:text-[#102000] shadow-2xs scale-[1.02] border border-[#181D13] dark:border-[#B8F36B] font-semibold'
                        : 'bg-[#F2F3EE] dark:bg-[#1E221A] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#434938] dark:text-[#C5CAB8] border border-[#E0E2D8] dark:border-[#282D22]'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 stroke-[2.5] shrink-0 text-[#B8F36B] dark:text-[#102000]" />
                    )}
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-[#F0F1EA] dark:border-[#242A1D] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#F2F3EE] dark:hover:bg-[#1E221A] transition-colors cursor-pointer disabled:opacity-50"
            >
              Skip for now
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-5 min-h-[44px] rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  if (!isOpen) return null;

  return (
    <OnboardingModalContent
      onClose={onClose}
      onComplete={onComplete}
    />
  );
};
