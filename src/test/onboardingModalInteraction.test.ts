import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { User } from '@supabase/supabase-js';
import { profileService, AVAILABLE_INTERESTS, UserProfile } from '../services/profile/profileService';

describe('Onboarding Modal Interaction & State Management', () => {
  const testUserId = `test-onboarding-user-${Date.now()}`;

  const mockUser: User = {
    id: testUserId,
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Elora Baruah', email: 'elora@example.com' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'elora@example.com',
  } as unknown as User;

  beforeEach(() => {
    // Ensure clean initial state
  });

  it('1. should initialize display name from profile, metadata, or email prefix without clobbering', async () => {
    const prof = await profileService.ensureProfile(mockUser);
    assert.strictEqual(prof.display_name, 'Elora Baruah');
    assert.deepStrictEqual(prof.interests, []);
    assert.strictEqual(prof.onboarding_completed, false);
  });

  it('2. should permit editing display name and updating it in persistent profile', async () => {
    const updated = await profileService.updateProfile(mockUser.id, {
      display_name: 'Elora B., Lead Researcher',
    });
    assert.strictEqual(updated.display_name, 'Elora B., Lead Researcher');

    const fetched = await profileService.getProfile(mockUser.id);
    assert.strictEqual(fetched?.display_name, 'Elora B., Lead Researcher');
  });

  it('3. should support independent selection and deselection of multiple interest chips', async () => {
    // Simulate toggling chips in sequence
    let userInterests: string[] = [];

    const toggleInterest = (interest: string) => {
      if (userInterests.includes(interest)) {
        userInterests = userInterests.filter((i) => i !== interest);
      } else {
        userInterests = [...userInterests, interest];
      }
    };

    // User selects 'Technology & AI' and 'Science'
    toggleInterest('Technology & AI');
    toggleInterest('Science');
    assert.deepStrictEqual(userInterests, ['Technology & AI', 'Science']);

    // User selects 'Programming'
    toggleInterest('Programming');
    assert.deepStrictEqual(userInterests, ['Technology & AI', 'Science', 'Programming']);

    // User deselects 'Science'
    toggleInterest('Science');
    assert.deepStrictEqual(userInterests, ['Technology & AI', 'Programming']);

    // User adds 'Creative writing' and 'History'
    toggleInterest('Creative writing');
    toggleInterest('History');
    assert.deepStrictEqual(userInterests, ['Technology & AI', 'Programming', 'Creative writing', 'History']);

    // Persist to user profile
    const saved = await profileService.updateProfile(mockUser.id, {
      interests: userInterests,
      onboarding_completed: true,
    });
    assert.deepStrictEqual(saved.interests, ['Technology & AI', 'Programming', 'Creative writing', 'History']);
    assert.strictEqual(saved.onboarding_completed, true);
  });

  it('4. should allow skipping optional interests while preserving the required name', async () => {
    const skipUserId = `user-skip-${Date.now()}`;
    const userToSkip: User = {
      id: skipUserId,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'skip.user@research.org',
    } as unknown as User;

    await profileService.ensureProfile(userToSkip);

    // User leaves interests empty and saves required name on skip
    const updated = await profileService.updateProfile(skipUserId, {
      display_name: 'Dr. Skip',
      interests: [],
      onboarding_completed: true,
    });

    assert.strictEqual(updated.display_name, 'Dr. Skip');
    assert.deepStrictEqual(updated.interests, []);
    assert.strictEqual(updated.onboarding_completed, true);
  });

  it('5. should never overwrite previously saved preferences with empty defaults on reload', async () => {
    // Simulate subsequent session check
    const reloaded = await profileService.ensureProfile(mockUser);
    assert.strictEqual(reloaded.display_name, 'Elora B., Lead Researcher');
    assert.deepStrictEqual(reloaded.interests, ['Technology & AI', 'Programming', 'Creative writing', 'History']);
    assert.strictEqual(reloaded.onboarding_completed, true);
  });

  it('6. should contain all 10 standard taxonomy interests', () => {
    const expected = [
      'Technology & AI',
      'Science',
      'Programming',
      'Business',
      'Education',
      'History',
      'Health',
      'Creative writing',
      'Design',
      'Other',
    ];

    for (const exp of expected) {
      assert.ok(AVAILABLE_INTERESTS.includes(exp as any), `AVAILABLE_INTERESTS should include ${exp}`);
    }
    assert.strictEqual(AVAILABLE_INTERESTS.length, 10);
  });
});
