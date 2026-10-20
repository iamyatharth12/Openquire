import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { credentialVault } from '../services/storage/indexedDbVault';
import { groundedSynthesis } from '../services/synthesis/groundedSynthesis';
import { geminiAdapter } from '../services/providers/geminiAdapter';

describe('Model Selection Flow & Provider Integration Audit', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    // Reset vault state before each test
    await credentialVault.removeKey('gemini');
    await credentialVault.removeKey('openai');
    await credentialVault.removeKey('anthropic');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Selecting a model in Settings and using that exact model for synthesis', async () => {
    const testApiKey = 'AIzaSyMockTestKeyValid1234567890123';
    const chosenModel = 'gemini-2.5-pro';

    // User saves key and selects preferred model in Settings
    await credentialVault.saveKey('gemini', testApiKey);
    await credentialVault.saveSelectedModel('gemini', chosenModel);

    let requestedUrl = '';
    let requestedHeaders: any = {};

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();

      // Mock search endpoint
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Quantum Computing Overview',
                url: 'https://example.com/quantum',
                snippet: 'Quantum computers use qubits to perform calculations [1].',
                domain: 'example.com',
                rank: 1,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Mock source retrieval endpoint
      if (urlStr.includes('/api/retrieve-sources')) {
        return new Response(
          JSON.stringify({
            sources: [
              {
                url: 'https://example.com/quantum',
                title: 'Quantum Computing Overview',
                text: 'Quantum computers use qubits to perform complex state calculations.',
                status: 'retrieved',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Intercept synthesis call to Gemini
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        requestedUrl = urlStr;
        requestedHeaders = init?.headers;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: '### Executive Summary\nQuantum computing harnesses quantum mechanics to accelerate computation [1].',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    // Execute research without explicit override - engine should pull chosenModel from Settings/Vault
    const result = await groundedSynthesis.executeResearch('Explain quantum computing');

    // Assert that the exact chosen model from settings was requested
    assert.ok(
      requestedUrl.includes(`/models/${chosenModel}:generateContent`),
      `Expected endpoint to contain ${chosenModel}, but was ${requestedUrl}`
    );
    assert.strictEqual(requestedHeaders['x-goog-api-key'], testApiKey);
    assert.strictEqual(result.requestedModel, chosenModel);
    assert.strictEqual(result.modelUsed, chosenModel);
    assert.strictEqual(result.modelConfirmed, true);
    assert.strictEqual(result.diagnosticInfo?.requestedModel, chosenModel);
    assert.strictEqual(result.diagnosticInfo?.modelConfirmed, true);
  });

  it('2. Changing the model in the composer and using it for the next request', async () => {
    const testApiKey = 'AIzaSyMockTestKeyValid1234567890123';
    await credentialVault.saveKey('gemini', testApiKey);
    await credentialVault.saveSelectedModel('gemini', 'gemini-2.5-flash');

    let invokedModel = '';

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Fusion Energy',
                url: 'https://example.com/fusion',
                snippet: 'Fusion powers the stars [1].',
                domain: 'example.com',
                rank: 1,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const match = urlStr.match(/\/models\/([^:]+):generateContent/);
        invokedModel = match ? match[1] : '';
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Nuclear fusion produces clean energy without long-lived waste [1].' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('OK', { status: 200 });
    };

    // User switches model in the composer to 'gemini-flash-latest'
    const composerSelectedModel = 'gemini-flash-latest';
    const result = await groundedSynthesis.executeResearch('How does nuclear fusion work?', {
      model: composerSelectedModel,
    });

    assert.strictEqual(invokedModel, composerSelectedModel);
    assert.strictEqual(result.requestedModel, composerSelectedModel);
    assert.strictEqual(result.modelUsed, composerSelectedModel);
    assert.strictEqual(result.modelConfirmed, true);
  });

  it('3. Preserving model selection across follow-up messages and page navigation', async () => {
    const testApiKey = 'AIzaSyMockKeyForFollowUps';
    const persistentModel = 'gemini-2.5-pro';

    await credentialVault.saveKey('gemini', testApiKey);
    await credentialVault.saveSelectedModel('gemini', persistentModel);

    const calls: string[] = [];

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Grid Battery Storage',
                url: 'https://example.com/battery',
                snippet: 'Battery energy storage systems balance electrical grids [1].',
                domain: 'example.com',
                rank: 1,
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const match = urlStr.match(/\/models\/([^:]+):generateContent/);
        if (match) calls.push(match[1]);
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Battery energy storage balances generation and load [1].' }],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response('OK', { status: 200 });
    };

    // Message 1 (Initial research query without override)
    const result1 = await groundedSynthesis.executeResearch('What is grid battery storage?');
    assert.strictEqual(result1.requestedModel, persistentModel);

    // Message 2 (Follow-up message reading from vault preference)
    const result2 = await groundedSynthesis.executeResearch('What are the chemical degradation mechanisms?');
    assert.strictEqual(result2.requestedModel, persistentModel);

    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0], persistentModel);
    assert.strictEqual(calls[1], persistentModel);
  });

  it('4. Excluding demo models from unconfigured providers', async () => {
    // No credentials configured
    const configuredProviders = await credentialVault.listConfiguredProviders();
    assert.strictEqual(configuredProviders.length, 0);

    // Attempting synthesis without a configured provider key must throw clear NO_API_KEY error
    await assert.rejects(
      async () => {
        await groundedSynthesis.executeResearch('Test unconfigured query');
      },
      (err: Error) => {
        assert.ok(err.message.includes('NO_API_KEY'));
        return true;
      }
    );
  });

  it('5. Handling stale or unavailable model IDs without silent substitution', async () => {
    const testApiKey = 'AIzaSyMockKeyForTestingStaleModel';
    const staleModelId = 'stale-unavailable-model-99';

    await credentialVault.saveKey('gemini', testApiKey);

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Solar Panels',
                url: 'https://example.com/solar',
                snippet: 'Photovoltaics convert light into electricity [1].',
                domain: 'example.com',
                rank: 1,
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        // Model not found (404)
        return new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: 'models/stale-unavailable-model-99 is not found for API version v1beta.',
              status: 'NOT_FOUND',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('OK', { status: 200 });
    };

    // Engine must throw clear MODEL_NOT_FOUND error and NOT silently fall back to gemini-3.5-flash or any other model
    await assert.rejects(
      async () => {
        await groundedSynthesis.executeResearch('Explain solar efficiency', {
          model: staleModelId,
        });
      },
      (err: Error) => {
        assert.ok(
          err.message.includes(`MODEL_NOT_FOUND (${staleModelId})`) ||
          err.message.includes(`MODEL_ERROR (${staleModelId})`),
          `Expected error to contain requested model failure, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('6. Ensuring the selected model reaches the provider adapter unchanged', async () => {
    const testApiKey = 'AIzaSyMockKeyForAdapterVerification';
    const customModel = 'gemini-2.5-pro-preview-05-2025';

    await credentialVault.saveKey('gemini', testApiKey);

    let sentModelParam = '';

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Wind Energy',
                url: 'https://example.com/wind',
                snippet: 'Wind turbines harness kinetic energy [1].',
                domain: 'example.com',
                rank: 1,
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const match = urlStr.match(/\/models\/([^:]+):generateContent/);
        sentModelParam = match ? match[1] : '';
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Wind turbines generate kinetic energy into rotational electricity [1].' }],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response('OK', { status: 200 });
    };

    const result = await groundedSynthesis.executeResearch('How do wind turbines work?', {
      model: customModel,
    });

    assert.strictEqual(sentModelParam, customModel);
    assert.strictEqual(result.requestedModel, customModel);
    assert.strictEqual(result.modelUsed, customModel);
    assert.strictEqual(result.diagnosticInfo?.requestedModel, customModel);
  });
});
