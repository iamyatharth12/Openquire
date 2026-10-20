import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AVAILABLE_INTERESTS, InterestCategory } from '../../services/profile/profileService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, profile, updateProfile } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && profile) {
      const initialName = profile.display_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : '');
      setDisplayName(initialName);
      setSelectedInterests(profile.interests || []);
      setErrorMessage(null);
    }
  }, [isOpen, profile, user]);

  if (!isOpen) return null;

  const toggleInterest = (interest: InterestCategory) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Please enter your preferred name to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await updateProfile({
        display_name: displayName.trim(),
        interests: selectedInterests,
        onboarding_completed: true,
      });
      onComplete();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner with Scholarly Warm Aesthetic */}
        <div className="bg-[#F8F9F5] px-6 pt-7 pb-5 border-b border-[#E8E8E5]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E0E5D3] text-[#434938] text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#416900]" />
            <span>Welcome to Openquire</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#191919] tracking-tight">
            Let's make Openquire yours.
          </h2>
          <p className="text-xs text-[#717171] mt-1.5 leading-relaxed">
            Personalize your scholarly research workspace. You can update these preferences anytime from your profile settings.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleContinue} className="p-6 space-y-6">
          {/* Field 1: Preferred Name */}
          <div className="space-y-1.5">
            <label htmlFor="preferred-name" className="block text-xs font-semibold text-[#191919]">
              What should we call you? <span className="text-rose-500">*</span>
            </label>
            <input
              id="preferred-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Your name"
              className="w-full bg-[#FBFBFA] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#191919] placeholder:text-[#999] focus:outline-none focus:border-[#416900] focus:ring-1 focus:ring-[#416900] transition-colors"
            />
            <p className="text-[11px] text-[#717171]">
              This is the name displayed on your research exports and workspace.
            </p>
          </div>

          {/* Field 2: Research Interests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#191919]">
                What are you interested in?
              </label>
              <span className="text-[11px] text-[#717171]">Optional</span>
            </div>
            <p className="text-[11px] text-[#717171] leading-relaxed">
              Interests personalize suggested research topics only. They never restrict searches, available models, or application functionality.
            </p>
            
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#181D13] text-[#B8F36B] shadow-2xs scale-[1.02]'
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

          {/* Buttons */}
          <div className="pt-3 border-t border-[#F0F1EA] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#717171] hover:text-[#191919] hover:bg-[#F2F3EE] transition-colors cursor-pointer"
            >
              Skip for now
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
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
