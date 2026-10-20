/**
 * Openquire Supabase Client & Persistence Adapter
 * 
 * Provides unified Supabase integration:
 * 1. Singleton @supabase/supabase-js client for Authentication & Database
 * 2. Email/Password sign-up, sign-in, password reset, and session management
 * 3. Google OAuth sign-in with popup and redirect callback handling
 * 4. Row-Level Security (RLS) conversation persistence with user isolation
 * 5. Safe fallback to local IndexedDB if table is not yet created or unconfigured
 */

import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Conversation } from './types';

export interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
  notes: string;
}

export const INTENDED_SUPABASE_PROJECT = 'nfyrssyydowzsyicxkzn';
export const INTENDED_SUPABASE_URL = 'https://nfyrssyydowzsyicxkzn.supabase.co';
export const INTENDED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wKb2gan2Bs0YTfYcPri6tA_xKUU5fET';

export const DEFAULT_SUPABASE_URL = INTENDED_SUPABASE_URL;
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = INTENDED_SUPABASE_PUBLISHABLE_KEY;

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonStr =
      typeof atob === 'function'
        ? atob(padded)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(padded, 'base64').toString('utf-8')
          : null;
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch {
    return null;
  }
}

function isValidProjectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) return false;
  if (url.includes('vfbzmpocffggmznjsabo')) return false;
  return url.includes('nfyrssyydowzsyicxkzn.supabase.co');
}

function isValidProjectKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('vfbzmpocffggmznjsabo')) return false;

  // Modern verified Supabase publishable key for project nfyrssyydowzsyicxkzn
  if (key === INTENDED_SUPABASE_PUBLISHABLE_KEY) return true;

  // Legacy JWT: verify decoded payload explicitly matches nfyrssyydowzsyicxkzn
  if (key.startsWith('eyJ')) {
    const payload = decodeJwtPayload(key);
    if (!payload || payload.ref !== INTENDED_SUPABASE_PROJECT) {
      return false;
    }
    return true;
  }

  return key.startsWith('sb_publishable_');
}

export function getSupabaseConfig(): SupabaseConfig {
  const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);
  const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : ({} as any);

  const rawUrl =
    metaEnv.VITE_SUPABASE_URL ||
    metaEnv.SUPABASE_URL ||
    procEnv.VITE_SUPABASE_URL ||
    procEnv.SUPABASE_URL;

  const url = isValidProjectUrl(rawUrl) ? rawUrl : INTENDED_SUPABASE_URL;

  const rawKey =
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    metaEnv.SUPABASE_PUBLISHABLE_KEY ||
    procEnv.VITE_SUPABASE_ANON_KEY ||
    procEnv.SUPABASE_PUBLISHABLE_KEY;

  const anonKey = isValidProjectKey(rawKey) ? rawKey : INTENDED_SUPABASE_PUBLISHABLE_KEY;

  const isConfigured = Boolean(url && anonKey && typeof url === 'string' && url.startsWith('http'));

  return {
    url,
    anonKey,
    isConfigured,
    notes: isConfigured
      ? 'Supabase configured: Authentication active, conversations synchronized with PostgreSQL Row Level Security (RLS).'
      : 'Supabase unconfigured: Using local browser storage (IndexedDB). History persists across page reloads in this browser, but does not sync across devices.',
  };
}

// ---------------------------------------------------------------------------
// Singleton Supabase Client
// ---------------------------------------------------------------------------
let _supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseInstance) return _supabaseInstance;

  const config = getSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null;
  }

  _supabaseInstance = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabaseInstance;
}

export const supabase = getSupabaseClient();

// ---------------------------------------------------------------------------
// Supabase Authentication Service
// ---------------------------------------------------------------------------
export interface AuthResult<T = any> {
  data?: T;
  error?: string;
  code?: string;
  requiresEmailVerification?: boolean;
}

export const authService = {
  isConfigured(): boolean {
    return Boolean(getSupabaseClient());
  },

  async getSession(): Promise<{ session: Session | null; user: User | null }> {
    const client = getSupabaseClient();
    if (!client) return { session: null, user: null };
    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn('Failed to retrieve Supabase session:', error.message);
        return { session: null, user: null };
      }
      return { session: data.session, user: data.session?.user || null };
    } catch (err: any) {
      console.warn('Error reading session:', err?.message);
      return { session: null, user: null };
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const client = getSupabaseClient();
    if (!client) {
      return { unsubscribe: () => {} };
    }
    const { data } = client.auth.onAuthStateChange(callback);
    return data.subscription;
  },

  async signUpWithEmail(email: string, password: string): Promise<AuthResult<User>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured. Check environment variables.' };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      // If identities is empty or confirmation required
      const requiresVerification = Boolean(
        data.user && (!data.session || (data.user.identities && data.user.identities.length === 0))
      );

      return {
        data: data.user || undefined,
        requiresEmailVerification: requiresVerification || !data.session,
      };
    } catch (err: any) {
      return { error: err?.message || 'Failed to complete sign-up.' };
    }
  },

  async signInWithEmail(email: string, password: string): Promise<AuthResult<Session>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      return { data: data.session };
    } catch (err: any) {
      return { error: err?.message || 'Login failed.' };
    }
  },

  async signInWithGoogle(options?: { redirectTo?: string; skipBrowserRedirect?: boolean }): Promise<AuthResult<{ url?: string }>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const redirectUrl = options?.redirectTo || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      const skipRedirect = options?.skipBrowserRedirect ?? false;
      
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: skipRedirect,
        },
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      return { data: { url: data?.url || undefined } };
    } catch (err: any) {
      return { error: err?.message || 'Failed to initiate Google sign-in.' };
    }
  },

  async updateEmail(newEmail: string): Promise<AuthResult<User>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await client.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      return { data: data.user };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update account email.' };
    }
  },


  async resetPasswordForEmail(email: string): Promise<AuthResult<void>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}#type=recovery` : undefined;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Password reset request failed.' };
    }
  },

  async updatePassword(newPassword: string): Promise<AuthResult<User>> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          error: mapAuthError(error.code || '', error.message),
          code: error.code,
        };
      }

      return { data: data.user };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update password.' };
    }
  },

  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  },
};

function mapAuthError(code: string, originalMessage: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'email_not_confirmed':
      return 'Your email has not been verified yet. Please check your inbox for the confirmation link.';
    case 'user_not_found':
      return 'No account was found with this email address.';
    case 'user_already_exists':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'weak_password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'over_email_send_rate_limit':
      return 'Too many email requests. Please wait a few moments before trying again.';
    default:
      return originalMessage || 'An unexpected authentication error occurred.';
  }
}

// ---------------------------------------------------------------------------
// Supabase REST Client with RLS & Table Verification
// ---------------------------------------------------------------------------
export class SupabaseRestClient {
  private config: SupabaseConfig;
  private tableExists: boolean | null = null; // cached state: null = unchecked, true = exists, false = not yet created

  constructor() {
    this.config = getSupabaseConfig();
  }

  get isConfigured(): boolean {
    return this.config.isConfigured;
  }

  get isTableReady(): boolean | null {
    return this.tableExists;
  }

  private async getAuthToken(): Promise<string | undefined> {
    const client = getSupabaseClient();
    if (!client) return undefined;
    try {
      const { data } = await client.auth.getSession();
      return data.session?.access_token;
    } catch {
      return undefined;
    }
  }

  private getHeaders(userToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.config.anonKey || '',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }
    return headers;
  }

  async list(explicitToken?: string): Promise<Conversation[]> {
    if (!this.config.isConfigured || !this.config.url) return [];
    if (this.tableExists === false) return [];

    try {
      const token = explicitToken || (await this.getAuthToken());
      const res = await fetch(`${this.config.url}/rest/v1/conversations?select=*&order=updated_at.desc`, {
        headers: this.getHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          const body = await res.json().catch(() => ({}));
          if (body?.code === 'PGRST205') {
            this.tableExists = false;
            console.warn('[Supabase] public.conversations table does not exist in schema cache. Run the SQL migration to enable remote PostgreSQL sync.');
            return [];
          }
        }
        throw new Error(`Supabase list error (${res.status}): ${res.statusText}`);
      }

      this.tableExists = true;
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        mode: row.mode,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        modelId: row.model_id,
        providerId: row.provider_id,
        initialQuery: row.initial_query,
        userId: row.user_id,
        messages: row.messages || [],
      }));
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local storage:', err);
      return [];
    }
  }

  async save(conversation: Conversation, explicitToken?: string): Promise<void> {
    if (!this.config.isConfigured || !this.config.url) return;
    if (this.tableExists === false) return;

    try {
      const client = getSupabaseClient();
      let sessionUser: User | null = null;
      let token = explicitToken;

      if (client) {
        const { data } = await client.auth.getSession();
        if (data.session) {
          token = token || data.session.access_token;
          sessionUser = data.session.user;
        }
      }

      const assignedUserId = conversation.userId || sessionUser?.id;

      const body = {
        id: conversation.id,
        title: conversation.title,
        mode: conversation.mode,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
        model_id: conversation.modelId,
        provider_id: conversation.providerId,
        initial_query: conversation.initialQuery,
        messages: conversation.messages,
        ...(assignedUserId ? { user_id: assignedUserId } : {}),
      };

      const res = await fetch(`${this.config.url}/rest/v1/conversations`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(token),
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 404 || errText.includes('PGRST205')) {
          this.tableExists = false;
          console.warn('[Supabase] public.conversations table not yet created. Saved safely to local storage.');
          return;
        }
        throw new Error(`Supabase save error (${res.status}): ${errText}`);
      }

      this.tableExists = true;
    } catch (err) {
      console.warn('Supabase remote save failed (stored in browser local vault):', err);
    }
  }

  async delete(id: string, explicitToken?: string): Promise<void> {
    if (!this.config.isConfigured || !this.config.url) return;
    if (this.tableExists === false) return;

    try {
      const token = explicitToken || (await this.getAuthToken());
      const res = await fetch(`${this.config.url}/rest/v1/conversations?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 404) return;
        throw new Error(`Supabase delete error: ${res.statusText}`);
      }
    } catch (err) {
      console.warn('Supabase remote delete failed:', err);
    }
  }
}

export const supabaseClient = new SupabaseRestClient();
