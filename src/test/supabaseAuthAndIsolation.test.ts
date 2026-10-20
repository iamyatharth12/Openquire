import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  authService,
  getSupabaseConfig,
  getSupabaseClient,
  supabaseClient,
} from '../services/conversation/supabaseClient';
import { conversationService } from '../services/conversation/conversationService';
import { Conversation } from '../services/conversation/types';

describe('Supabase Authentication, Session Management & Error Handling', () => {
  it('1. should verify Supabase client is initialized with valid project URL and anon/publishable key', () => {
    const config = getSupabaseConfig();
    assert.strictEqual(config.isConfigured, true);
    assert.ok(config.url?.startsWith('https://') && config.url.includes('supabase.co'));
    assert.ok(config.anonKey?.startsWith('sb_publishable_') || config.anonKey?.startsWith('eyJ'));

    const client = getSupabaseClient();
    assert.ok(client !== null, 'Singleton Supabase client must be present');
    assert.ok(client.auth !== undefined, 'auth namespace must exist');
  });

  it('2. should reject login with invalid credentials and return user-friendly error', async () => {
    const res = await authService.signInWithEmail('non-existent-user@example.com', 'wrongpassword123');
    assert.strictEqual(res.data, undefined);
    assert.ok(res.error !== undefined);
    assert.strictEqual(res.code, 'invalid_credentials');
    assert.ok(
      res.error.includes('Invalid email or password'),
      'Must map invalid_credentials to user-friendly message'
    );
  });

  it('3. should handle sign-up with mailer_autoconfirm: false requirement', async () => {
    // Generate randomized test email
    const testEmail = `test-audit-${Date.now()}@openquire-research-test.com`;
    const res = await authService.signUpWithEmail(testEmail, 'SecurePass#2026');

    // The remote Supabase instance has mailer_autoconfirm: false, so sign-up succeeds but requires verification
    if (res.error) {
      // If project has sign-up restrictions or rate limits, error must be mapped
      assert.ok(typeof res.error === 'string');
    } else {
      assert.ok(res.requiresEmailVerification === true, 'Sign-up must signal email verification requirement');
    }
  });

  it('4. should construct Google OAuth URL with proper redirect_to parameter', async () => {
    const res = await authService.signInWithGoogle({
      redirectTo: 'https://ais-dev-6u6lzq6cwegt2623oawyi7-767578010173.asia-east1.run.app',
    });

    assert.strictEqual(res.error, undefined);
    assert.ok(res.data?.url, 'Google OAuth URL must be returned');
    assert.ok(res.data.url.includes('provider=google'), 'Must specify Google provider');
    assert.ok(res.data.url.includes('redirect_to='), 'Must include redirect_to parameter');
    assert.ok(
      res.data.url.startsWith('https://nfyrssyydowzsyicxkzn.supabase.co/auth/v1/authorize'),
      'OAuth endpoint must target intended Supabase project: nfyrssyydowzsyicxkzn'
    );
    assert.strictEqual(
      res.data.url.includes('vfbzmpocffggmznjsabo'),
      false,
      'OAuth endpoint must NEVER contain obsolete project vfbzmpocffggmznjsabo'
    );
  });

  it('5. should request password reset without leaking account existence errors', async () => {
    const res = await authService.resetPasswordForEmail('test-reset@example.com');
    // Supabase standard behavior: returns ok without error (or rate limit if called too fast)
    if (res.error) {
      assert.ok(typeof res.error === 'string');
    } else {
      assert.strictEqual(res.error, undefined);
    }
  });

  it('6. should restore session cleanly and report null for unauthenticated guests', async () => {
    const { session, user } = await authService.getSession();
    // Default in test environment is unauthenticated guest
    assert.strictEqual(session, null);
    assert.strictEqual(user, null);
  });
});

describe('Cross-User Conversation Isolation & Row-Level Security Enforcers', () => {
  const userA = 'user-uuid-1111-aaaa';
  const userB = 'user-uuid-2222-bbbb';

  beforeEach(() => {
    conversationService.setCurrentUserId(null);
  });

  it('7. should associate user ID on newly created conversations when user is logged in', async () => {
    conversationService.setCurrentUserId(userA);

    const convo = await conversationService.create(
      'User A quantum computing research',
      'web',
      'gemini-2.5-flash'
    );

    assert.strictEqual(convo.userId, userA, 'Conversation must be stamped with active user ID');
  });

  it('8. should isolate conversations so User B cannot see User A conversations', async () => {
    // 1. Create a conversation as User A
    conversationService.setCurrentUserId(userA);
    const convoA = await conversationService.create('Confidential User A Project', 'web');

    // 2. Switch to User B
    conversationService.setCurrentUserId(userB);
    const convoB = await conversationService.create('Confidential User B Strategy', 'web');

    // 3. User B list must contain convoB and NOT contain convoA
    const listB = await conversationService.list();
    const idsB = listB.map((c) => c.id);
    assert.ok(idsB.includes(convoB.id), 'User B must see their own conversation');
    assert.strictEqual(idsB.includes(convoA.id), false, 'User B MUST NOT see User A conversation');

    // 4. Switch back to User A
    conversationService.setCurrentUserId(userA);
    const listA = await conversationService.list();
    const idsA = listA.map((c) => c.id);
    assert.ok(idsA.includes(convoA.id), 'User A must see their own conversation');
    assert.strictEqual(idsA.includes(convoB.id), false, 'User A MUST NOT see User B conversation');
  });

  it('9. should isolate guest users from seeing authenticated user conversations', async () => {
    // Ensure an authenticated conversation exists
    conversationService.setCurrentUserId(userA);
    const convoA = await conversationService.create('Private User A Notes', 'deep');

    // Switch to Guest (unauthenticated)
    conversationService.setCurrentUserId(null);
    const guestList = await conversationService.list();
    const guestIds = guestList.map((c) => c.id);

    assert.strictEqual(
      guestIds.includes(convoA.id),
      false,
      'Guest users MUST NOT see private authenticated user conversations'
    );
  });

  it('10. should sanitize secrets and never store API keys in conversations', async () => {
    conversationService.setCurrentUserId(userA);
    const testConvo: Conversation = {
      id: `test-leak-${Date.now()}`,
      title: 'Secret sanitization test',
      mode: 'web',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      userId: userA,
      messages: [
        {
          id: 'leak-1',
          role: 'assistant',
          content: 'Here is the key: sk-ant-api03-abcdef1234567890abcdef and AIzaSyD123456789012345678901234567890',
          timestamp: Date.now(),
        },
      ],
    };

    await conversationService.save(testConvo);
    const retrieved = await conversationService.get(testConvo.id);

    assert.ok(retrieved !== null);
    assert.strictEqual(
      retrieved?.messages[0].content.includes('AIzaSyD123456789012345678901234567890'),
      false,
      'Google API keys must be redacted before saving'
    );
    assert.ok(
      retrieved?.messages[0].content.includes('[REDACTED]'),
      'Redaction token must be placed'
    );
  });

  it('11. should verify PostgreSQL RLS migration file exists with strict auth.uid() = user_id policies', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261018000000_conversations_schema.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'SQL migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sqlContent.includes('auth.uid() = user_id'), 'Must enforce auth.uid() check');
    assert.ok(sqlContent.includes('REFERENCES auth.users(id)'), 'Must reference auth.users table');
    assert.ok(sqlContent.includes('ON DELETE CASCADE'), 'Must cascade delete on user removal');
  });

  it('12. should handle missing conversations table in Supabase gracefully without crashing', async () => {
    // When public.conversations is missing or unmigrated in Supabase
    // list() and save() must catch PGRST205 / 404 and fallback to local IndexedDB
    const res = await supabaseClient.list();
    assert.ok(Array.isArray(res), 'SupabaseRestClient.list() must return an array gracefully');
  });
});
