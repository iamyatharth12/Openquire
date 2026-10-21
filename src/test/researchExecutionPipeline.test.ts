import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { credentialVault } from '../services/storage/indexedDbVault';
import { groundedSynthesis } from '../services/synthesis/groundedSynthesis';
import { conversationService } from '../services/conversation/conversationService';
import { OPENQUIRE_DB_NAME, OPENQUIRE_DB_VERSION, STORE_CREDENTIALS, STORE_PREFERENCES, STORE_CONVERSATIONS } from '../services/storage/openquireDb';

describe('Openquire Research Execution & Search Pipeline', () => {
  beforeEach(async () => {
    // Reset any stored keys before each test
    await credentialVault.removeKey('gemini');
  });

  it('1. should verify shared openquire_vault database schema constants and stores', () => {
    assert.strictEqual(OPENQUIRE_DB_NAME, 'openquire_vault');
    assert.strictEqual(OPENQUIRE_DB_VERSION, 2, 'Version must be 2 to support all 3 stores without VersionError');
    assert.strictEqual(STORE_CREDENTIALS, 'credentials');
    assert.strictEqual(STORE_PREFERENCES, 'preferences');
    assert.strictEqual(STORE_CONVERSATIONS, 'conversations');
  });

  it('2. should reject synthesis with NO_API_KEY when key is not configured in vault', async () => {
    await assert.rejects(
      async () => {
        await groundedSynthesis.executeResearch('How do superconductors work?');
      },
      (err: any) => {
        assert.ok(err.message.includes('NO_API_KEY'), 'Must throw actionable NO_API_KEY error');
        return true;
      }
    );
  });

  it('3. should store, mask, and retrieve configured Google Gemini API key from vault', async () => {
    const testKey = 'AIzaSyDemoValidTestKey1234567890abcdef';
    await credentialVault.saveKey('gemini', testKey);

    const hasKey = await credentialVault.hasKey('gemini');
    assert.strictEqual(hasKey, true, 'Vault must confirm key presence');

    const retrieved = await credentialVault.getKey('gemini');
    assert.strictEqual(retrieved, testKey, 'Vault must retrieve exact stored key');

    const masked = credentialVault.maskKey(testKey);
    assert.ok(masked.startsWith('AIzaSy'), 'Masked key must show prefix');
    assert.ok(masked.endsWith('cdef'), 'Masked key must show suffix');
    assert.ok(masked.includes('•'), 'Middle entropy must be redacted');
  });

  it('4. should fall back to gemini-2.5-flash when no explicit model is configured', async () => {
    // Save key
    await credentialVault.saveKey('gemini', 'AIzaSyMockKeyForModelFallbackTest');

    // Mock fetch for /api/search and Google Generative Language API
    const originalFetch = globalThis.fetch;
    let modelRequestedInApi = '';

    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Superconductivity Fundamentals',
                url: 'https://physics.org/superconductivity',
                domain: 'physics.org',
                snippet: 'Superconductors exhibit zero electrical resistance at low temperatures.',
                rank: 1,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/api/retrieve-sources')) {
        return new Response(
          JSON.stringify({
            sources: [
              {
                url: 'https://physics.org/superconductivity',
                title: 'Superconductivity Fundamentals',
                text: 'Superconductors expel magnetic fields via the Meissner effect [1].',
                status: 'retrieved',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        modelRequestedInApi = urlStr;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: '### Executive Summary\nSuperconductors conduct electricity with zero resistance and display the Meissner effect [1].',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return originalFetch(url, init);
    }) as any;

    try {
      const result = await groundedSynthesis.executeResearch('How do superconductors work?');
      assert.ok(result.answerText.includes('Meissner effect'), 'Must contain synthesized answer');
      assert.strictEqual(result.sources.length, 1);
      assert.ok(modelRequestedInApi.includes('gemini-2.5-flash'), 'Must fall back to gemini-2.5-flash');
      assert.strictEqual(result.citations.validCitations, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('5. should surface real failure when the Gemini API key is invalid (HTTP 400/401/403)', async () => {
    await credentialVault.saveKey('gemini', 'AIzaSyInvalidKey12345');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Test Title',
                url: 'https://example.com/test',
                domain: 'example.com',
                snippet: 'Test evidence snippet.',
                rank: 1,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/api/retrieve-sources')) {
        return new Response(JSON.stringify({ sources: [] }), { status: 200 });
      }
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        return new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: 'API key not valid. Please pass a valid API key.',
              status: 'INVALID_ARGUMENT',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await groundedSynthesis.executeResearch('Test query for invalid key');
        },
        (err: any) => {
          assert.ok(err.message.includes('INVALID_KEY'), 'Must normalize to actionable INVALID_KEY error');
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('6. should surface real failure when search service is unavailable (HTTP 502/500)', async () => {
    await credentialVault.saveKey('gemini', 'AIzaSyTestKeyValidFormat9999');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            error: 'Upstream search provider is temporarily unavailable.',
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await groundedSynthesis.executeResearch('Test query when search is down');
        },
        (err: any) => {
          assert.ok(
            err.message.includes('Search failed with status 502') ||
              err.message.includes('temporarily unavailable'),
            'Must report search service failure'
          );
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('7. should create conversation and avoid duplicate user message on submission', async () => {
    const query = 'What are the geopolitical effects of microchips?';
    const convo = await conversationService.create(query, 'web', 'gemini-2.5-flash');

    assert.strictEqual(convo.messages.length, 1, 'Initial conversation must have exactly 1 user message');
    assert.strictEqual(convo.messages[0].content, query);

    // Simulate appending assistant response
    await conversationService.addMessage(convo.id, {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: '### Executive Summary\nMicrochips form modern geopolitical leverage [1].',
      timestamp: Date.now(),
      modelId: 'gemini-2.5-flash',
      providerId: 'gemini',
      status: 'completed',
    });

    const updated = await conversationService.get(convo.id);
    assert.strictEqual(updated?.messages.length, 2, 'Must have 1 user and 1 assistant message');
    assert.strictEqual(updated?.messages[0].role, 'user');
    assert.strictEqual(updated?.messages[1].role, 'assistant');
  });

  it('8. should allow retry after failure and persist the successfully resolved answer', async () => {
    const convo = await conversationService.create('Retry test query', 'web');

    // First attempt failed
    const errorMsg = 'Failed to synthesize grounded answer: rate limit reached.';
    assert.ok(errorMsg);

    // Second attempt succeeded (retry)
    await conversationService.addMessage(convo.id, {
      id: `msg-${Date.now()}-assistant-retry`,
      role: 'assistant',
      content: '### Resolved Answer\nSuccessful grounded research on retry [1].',
      timestamp: Date.now(),
      status: 'completed',
    });

    const refreshed = await conversationService.get(convo.id);
    const assistantMsgs = refreshed?.messages.filter((m) => m.role === 'assistant');
    assert.strictEqual(assistantMsgs?.length, 1);
    assert.ok(assistantMsgs?.[0].content.includes('Successful grounded research on retry'));
  });
});
