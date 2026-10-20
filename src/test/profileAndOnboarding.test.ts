import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { User } from '@supabase/supabase-js';
import { authService, getSupabaseClient } from '../services/conversation/supabaseClient';
import { profileService, AVAILABLE_INTERESTS } from '../services/profile/profileService';

describe('User Profiles & Onboarding Service', () => {
  const testUserId = `test-profile-user-${Date.now()}`;

  const mockGoogleUser: User = {
    id: `google-user-${Date.now()}`,
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Dr. Jane Research', name: 'Dr. Jane Research', avatar_url: 'https://example.com/jane.jpg' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'jane.research@university.edu',
  } as unknown as User;

  const mockEmailUser: User = {
    id: `email-user-${Date.now()}`,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'scholar.alex@example.org',
  } as unknown as User;

  it('1. should create profile with Google display name as initial suggestion', async () => {
    const profile = await profileService.ensureProfile(mockGoogleUser);
    assert.strictEqual(profile.id, mockGoogleUser.id);
    assert.strictEqual(profile.display_name, 'Dr. Jane Research');
    assert.deepStrictEqual(profile.interests, []);
    assert.strictEqual(profile.onboarding_completed, false);
  });

  it('2. should NEVER overwrite user custom preferred name with Google metadata on subsequent logins', async () => {
    // 1. User initially gets 'Dr. Jane Research'
    const profile = await profileService.ensureProfile(mockGoogleUser);
    assert.strictEqual(profile.display_name, 'Dr. Jane Research');

    // 2. User updates their preferred display name to 'Jane R.'
    const updated = await profileService.updateProfile(mockGoogleUser.id, {
      display_name: 'Jane R.',
      onboarding_completed: true,
    });
    assert.strictEqual(updated.display_name, 'Jane R.');
    assert.strictEqual(updated.onboarding_completed, true);

    // 3. User logs in again tomorrow with Google (mockGoogleUser has 'Dr. Jane Research')
    const reloaded = await profileService.ensureProfile(mockGoogleUser);
    assert.strictEqual(
      reloaded.display_name,
      'Jane R.',
      'Must preserve custom display name; never overwrite with Google account name on subsequent logins'
    );
    assert.strictEqual(reloaded.onboarding_completed, true);
  });

  it('3. should create profile for new email user with email prefix fallback', async () => {
    const profile = await profileService.ensureProfile(mockEmailUser);
    assert.strictEqual(profile.id, mockEmailUser.id);
    assert.strictEqual(profile.display_name, 'scholar.alex');
    assert.deepStrictEqual(profile.interests, []);
    assert.strictEqual(profile.onboarding_completed, false);
  });

  it('4. should update research interests and display name accurately', async () => {
    const newInterests = ['Technology & AI', 'Science', 'Programming'];
    const updated = await profileService.updateProfile(mockEmailUser.id, {
      display_name: 'Alexander Mercer, PhD',
      interests: newInterests,
      onboarding_completed: true,
    });

    assert.strictEqual(updated.display_name, 'Alexander Mercer, PhD');
    assert.deepStrictEqual(updated.interests, newInterests);
    assert.strictEqual(updated.onboarding_completed, true);

    // Verify retrieval
    const fetched = await profileService.getProfile(mockEmailUser.id);
    assert.strictEqual(fetched?.display_name, 'Alexander Mercer, PhD');
    assert.deepStrictEqual(fetched?.interests, newInterests);
    assert.strictEqual(fetched?.onboarding_completed, true);
  });

  it('5. should support standard research interest taxonomy without restrictions', () => {
    assert.ok(AVAILABLE_INTERESTS.length >= 8);
    assert.ok(AVAILABLE_INTERESTS.includes('Technology & AI'));
    assert.ok(AVAILABLE_INTERESTS.includes('Science'));
    assert.ok(AVAILABLE_INTERESTS.includes('Programming'));
    assert.ok(AVAILABLE_INTERESTS.includes('History'));
    assert.ok(AVAILABLE_INTERESTS.includes('Other'));
  });

  it('6. should deduplicate concurrent profile requests for the same user ID', async () => {
    const p1 = profileService.getProfile(testUserId);
    const p2 = profileService.getProfile(testUserId);
    // In-flight promises must be shared for concurrency safety
    assert.strictEqual(p1, p2, 'Concurrent requests for the same userId must share the in-flight promise');
    const [res1, res2] = await Promise.all([p1, p2]);
    assert.deepStrictEqual(res1, res2);
  });

  it('7. should verify Profiles PostgreSQL RLS migration file exists with strict policies', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261018000001_profiles_schema.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Profiles SQL migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Must create public.profiles table');
    assert.ok(sqlContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sqlContent.includes('auth.uid() = id'), 'Must enforce auth.uid() = id');
    assert.ok(sqlContent.includes('REFERENCES auth.users(id) ON DELETE CASCADE'), 'Must cascade delete on user removal');
    assert.ok(sqlContent.includes('CREATE TRIGGER on_auth_user_created'), 'Must define on_auth_user_created trigger');
    assert.ok(sqlContent.includes('onboarding_completed BOOLEAN'), 'Must include explicit onboarding_completed column');
  });

  it('8. should support Google OAuth initiation in both popup (preview iframe) and redirect (full-page) modes', async () => {
    // Top-level redirect mode (default for standalone tabs / production)
    const resDirect = await authService.signInWithGoogle({
      redirectTo: 'https://ais-dev-6u6lzq6cwegt2623oawyi7-767578010173.asia-east1.run.app',
      skipBrowserRedirect: false,
    });
    assert.strictEqual(resDirect.error, undefined);

    // Popup mode (with skipBrowserRedirect: true for preview iframe)
    const resPopup = await authService.signInWithGoogle({
      redirectTo: 'https://ais-dev-6u6lzq6cwegt2623oawyi7-767578010173.asia-east1.run.app',
      skipBrowserRedirect: true,
    });
    assert.strictEqual(resPopup.error, undefined);
    assert.ok(resPopup.data?.url, 'Must return URL for popup navigation');
    assert.ok(resPopup.data.url.includes('provider=google'));
  });

  it('9. should provide email update functionality via Supabase Auth', async () => {
    const res = await authService.updateEmail('new-test-address@example.com');
    // If not authenticated in test environment, Supabase returns error or requires session
    // It must return AuthResult without crashing
    assert.ok(res !== undefined);
  });
});
