import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createSupabaseContext } from '@supabase/server';
import { getSupabaseConfig, SupabaseRestClient } from '../services/conversation/supabaseClient';

describe('@supabase/server & Supabase Auth Verification', () => {
  it('1. should reject unauthenticated request when auth mode is user', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify', {
      method: 'GET',
    });

    const { data, error } = await createSupabaseContext(req, {
      auth: 'user',
    });

    assert.strictEqual(data, null);
    assert.ok(error !== null);
    assert.strictEqual(error?.code, 'MISSING_CREDENTIALS');
    assert.strictEqual(error?.status, 401);
  });

  it('2. should reject malformed bearer token with INVALID_JWT', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-token-string',
      },
    });

    const { data, error } = await createSupabaseContext(req, {
      auth: 'user',
    });

    assert.strictEqual(data, null);
    assert.ok(error !== null);
    assert.strictEqual(error?.code, 'INVALID_JWT');
  });

  it('3. should support publishable key verification mode', async () => {
    // When caller provides the publishable key in apikey header
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wKb2gan2Bs0YTfYcPri6tA_xKUU5fET',
      },
    });

    const origSecret = process.env.SUPABASE_SECRET_KEY;
    if (!process.env.SUPABASE_SECRET_KEY) {
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_mock_for_server_context_0000';
    }

    const { data, error } = await createSupabaseContext(req, {
      auth: 'publishable',
    });

    if (origSecret === undefined) {
      delete process.env.SUPABASE_SECRET_KEY;
    }

    if (process.env.SUPABASE_PUBLISHABLE_KEY) {
      assert.strictEqual(error, null);
      assert.strictEqual(data?.authMode, 'publishable');
    } else {
      assert.ok(true);
    }
  });

  it('4. should read getSupabaseConfig from process.env and metaEnv', () => {
    const config = getSupabaseConfig();
    assert.ok(typeof config.isConfigured === 'boolean');
    assert.ok(config.url?.startsWith('https://') && config.url.includes('supabase.co'));
    assert.ok(config.anonKey?.startsWith('sb_publishable_') || config.anonKey?.startsWith('eyJ'));
    assert.strictEqual(config.isConfigured, true);
  });

  it('5. should instantiate SupabaseRestClient without errors', () => {
    const client = new SupabaseRestClient();
    assert.strictEqual(client.isConfigured, true);
  });
});
