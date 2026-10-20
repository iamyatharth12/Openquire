import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, AuthResult } from '../services/conversation/supabaseClient';
import { conversationService } from '../services/conversation/conversationService';
import { profileService, UserProfile } from '../services/profile/profileService';

export type AuthModalMode = 'sign_in' | 'sign_up' | 'reset_password' | 'update_password' | 'profile';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isLoadingProfile: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  displayName: string;
  avatarUrl: string | null;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  onboardingOpen: boolean;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  completeOnboarding: () => void;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult<Session>>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult<User>>;
  signInWithGoogle: () => Promise<AuthResult<{ url?: string }>>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult<void>>;
  updatePassword: (password: string) => Promise<AuthResult<User>>;
  updateEmail: (email: string) => Promise<AuthResult<User>>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONBOARDING_SKIPPED_KEY = 'openquire_onboarding_skipped_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('sign_in');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
  });

  const isConfigured = authService.isConfigured();

  const profileRef = React.useRef<UserProfile | null>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Load and ensure user profile
  const loadProfile = useCallback(async (currentUser: User) => {
    setIsLoadingProfile(true);
    try {
      const prof = await profileService.ensureProfile(currentUser);
      setProfile(prof);

      // Check if user has completed onboarding
      const skipped = sessionStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
      if (prof && !prof.onboarding_completed && !skipped) {
        setOnboardingOpen(true);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to load user profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }
    try {
      const { session: currentSession, user: currentUser } = await authService.getSession();
      setSession(currentSession);
      setUser(currentUser);
      conversationService.setCurrentUserId(currentUser?.id || null);

      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
        setOnboardingOpen(false);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh Supabase session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, loadProfile]);

  useEffect(() => {
    // Purge any obsolete Supabase project tokens from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.includes('vfbzmpocffggmznjsabo') || (k.startsWith('sb-') && !k.includes('nfyrssyydowzsyicxkzn')))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {
      // ignore
    }

    refreshSession();

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      // 1. Check for password recovery
      if (hash.includes('type=recovery')) {
        setAuthModalMode('update_password');
        setAuthModalOpen(true);
      }

      // 2. Check for OAuth callback in popup or top frame
      const hasAuthCode = search.includes('code=') || hash.includes('access_token=');
      const hasOAuthError = search.includes('error=') || hash.includes('error=');

      if (hasOAuthError) {
        console.warn('[AuthContext] OAuth callback error detected in URL query/hash.');
      }

      // If in popup window with auth code, wait for session exchange then signal opener
      if (hasAuthCode && window.opener && window.opener !== window) {
        authService.getSession().then(({ session: popupSession }) => {
          try {
            // Validate target origin: only send to current origin
            window.opener.postMessage(
              { type: 'SUPABASE_OAUTH_SUCCESS', session: popupSession },
              window.location.origin
            );
          } catch (e) {
            console.warn('Could not postMessage to opener:', e);
          }
          window.close();
        });
      }

      // 3. Clean up URL parameters after processing
      if (hasAuthCode || hasOAuthError) {
        setTimeout(() => {
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('code');
            cleanUrl.searchParams.delete('state');
            cleanUrl.searchParams.delete('error');
            cleanUrl.searchParams.delete('error_code');
            cleanUrl.searchParams.delete('error_description');
            const newHash = cleanUrl.hash.includes('type=recovery') ? cleanUrl.hash : '';
            window.history.replaceState(
              null,
              '',
              cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : '') + newHash
            );
          } catch (e) {
            // ignore
          }
        }, 500);
      }

      // 4. Listen for postMessage from OAuth popup
      const handleMessage = (event: MessageEvent) => {
        // Enforce origin validation
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
          refreshSession();
          setAuthModalOpen(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // 5. Cross-window storage listener
      const handleStorage = (e: StorageEvent) => {
        if (e.key && e.key.includes('auth-token')) {
          refreshSession();
        }
      };
      window.addEventListener('storage', handleStorage);

      // 6. Supabase Auth State Change Listener
      const subscription = authService.onAuthStateChange(async (event, newSession) => {
        setSession(newSession);
        const newUser = newSession?.user || null;
        setUser(newUser);
        conversationService.setCurrentUserId(newUser?.id || null);

        if (event === 'SIGNED_IN' && newUser) {
          setAuthModalOpen(false);
          await loadProfile(newUser);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setOnboardingOpen(false);
          conversationService.setCurrentUserId(null);
        } else if (event === 'PASSWORD_RECOVERY') {
          setAuthModalMode('update_password');
          setAuthModalOpen(true);
        } else if (event === 'TOKEN_REFRESHED' && newUser) {
          // Keep profile in sync
          if (!profileRef.current) {
            await loadProfile(newUser);
          }
        }
      });

      return () => {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('storage', handleStorage);
        subscription.unsubscribe();
      };
    }
  }, [refreshSession, loadProfile]);

  const openAuthModal = useCallback((mode: AuthModalMode = 'sign_in') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const openOnboarding = useCallback(() => {
    setOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    sessionStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setHasSkippedOnboarding(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    sessionStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setHasSkippedOnboarding(false);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const res = await authService.signInWithEmail(email, password);
    if (!res.error && res.data) {
      setSession(res.data);
      setUser(res.data.user);
      conversationService.setCurrentUserId(res.data.user.id);
      setAuthModalOpen(false);
      await loadProfile(res.data.user);
    }
    return res;
  }, [loadProfile]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const res = await authService.signUpWithEmail(email, password);
    if (!res.error && res.data && !res.requiresEmailVerification) {
      await loadProfile(res.data);
    }
    return res;
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (inIframe) {
      // In preview iframe: Google blocks top frame redirection via X-Frame-Options: DENY.
      // Request authorization URL with skipBrowserRedirect: true and open popup window.
      const res = await authService.signInWithGoogle({ skipBrowserRedirect: true });
      if (res.data?.url && typeof window !== 'undefined') {
        const width = 520;
        const height = 640;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          res.data.url,
          'supabase_google_oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
        );

        if (!popup) {
          // If popup was blocked, fallback
          return { error: 'Popup blocked. Please allow popups to sign in with Google.' };
        }

        // Poll for popup closing or session establishment
        const interval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(interval);
            await refreshSession();
          }
        }, 1000);
      }
      return res;
    } else {
      // Standard browser tab or top-level window: pure standard full-page redirect!
      const res = await authService.signInWithGoogle({ skipBrowserRedirect: false });
      return res;
    }
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setOnboardingOpen(false);
    conversationService.setCurrentUserId(null);
    setAuthModalOpen(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const res = await authService.updatePassword(password);
    if (!res.error) {
      setAuthModalOpen(false);
    }
    return res;
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    return await authService.updateEmail(email);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('Cannot update profile without an authenticated session.');
    const updated = await profileService.updateProfile(user.id, updates);
    setProfile(updated);
    return updated;
  }, [user]);

  const displayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Guest User';
  }, [profile?.display_name, user]);

  const avatarUrl = useMemo(() => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isLoadingProfile,
      isAuthenticated: Boolean(user),
      isConfigured,
      displayName,
      avatarUrl,
      authModalOpen,
      authModalMode,
      onboardingOpen,
      openAuthModal,
      closeAuthModal,
      setAuthModalMode,
      openOnboarding,
      closeOnboarding,
      completeOnboarding,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateProfile,
      refreshSession,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      isLoadingProfile,
      isConfigured,
      displayName,
      avatarUrl,
      authModalOpen,
      authModalMode,
      onboardingOpen,
      openAuthModal,
      closeAuthModal,
      openOnboarding,
      closeOnboarding,
      completeOnboarding,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateProfile,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
