import { describe, it } from 'node:test';
import assert from 'node:assert';
import { geminiAdapter } from '../services/providers/geminiAdapter';

describe('Google Gemini Provider Adapter & Error Normalization', () => {
  it('should normalize invalid API key error into structured INVALID_KEY', () => {
    const rawError = {
      status: 400,
      errorData: {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key (AIzaSySecretKeySample1234567890123).',
          status: 'INVALID_ARGUMENT',
        },
      },
    };

    const normalized = geminiAdapter.normalizeError(rawError);

    assert.strictEqual(normalized.code, 'INVALID_KEY');
    assert.strictEqual(normalized.httpStatus, 400);
    assert.ok(normalized.suggestedAction.includes('Google AI Studio'));
    assert.strictEqual(
      normalized.details?.includes('AIzaSySecretKeySample1234567890123'),
      false,
      'Raw API key must be scrubbed from details'
    );
  });

  it('should normalize quota exhaustion into QUOTA_EXCEEDED', () => {
    const rawError = {
      status: 429,
      errorData: {
        error: {
          code: 429,
          message: 'Resource has been exhausted (e.g. check quota).',
          status: 'RESOURCE_EXHAUSTED',
        },
      },
    };

    const normalized = geminiAdapter.normalizeError(rawError);

    assert.strictEqual(normalized.code, 'QUOTA_EXCEEDED');
    assert.strictEqual(normalized.httpStatus, 429);
    assert.ok(normalized.message.includes('quota'));
  });

  it('should normalize permission denial into PERMISSION_DENIED', () => {
    const rawError = {
      status: 403,
      errorData: {
        error: {
          code: 403,
          message: 'Generative Language API has not been used in project 123456 before or it is disabled.',
          status: 'PERMISSION_DENIED',
        },
      },
    };

    const normalized = geminiAdapter.normalizeError(rawError);

    assert.strictEqual(normalized.code, 'PERMISSION_DENIED');
    assert.strictEqual(normalized.httpStatus, 403);
    assert.ok(normalized.suggestedAction.includes('Google Cloud / AI Studio'));
  });

  it('should normalize network failures into NETWORK_ERROR', () => {
    const networkError = new TypeError('Failed to fetch');

    const normalized = geminiAdapter.normalizeError(networkError);

    assert.strictEqual(normalized.code, 'NETWORK_ERROR');
    assert.ok(normalized.details?.includes('generativelanguage.googleapis.com'));
  });

  it('should normalize timeout errors into TIMEOUT', () => {
    const timeoutError = {
      name: 'AbortError',
      message: 'The operation was aborted due to timeout.',
    };

    const normalized = geminiAdapter.normalizeError(timeoutError);

    assert.strictEqual(normalized.code, 'TIMEOUT');
    assert.strictEqual(normalized.httpStatus, 408);
  });

  it('should reject empty credentials without firing external requests', async () => {
    const result = await geminiAdapter.validateCredential('   ');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'INVALID_KEY');
  });
});
