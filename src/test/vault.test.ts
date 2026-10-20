import { describe, it } from 'node:test';
import assert from 'node:assert';
import { credentialVault } from '../services/storage/indexedDbVault';

describe('BYOK Credential Vault (IndexedDB Storage & In-Memory Fallback)', () => {
  it('should mask API keys securely without exposing middle entropy', () => {
    const key = 'AIzaSyB1234567890abcdefghijklmnopqrstuv7kL9';
    const masked = credentialVault.maskKey(key);

    assert.ok(masked.startsWith('AIzaSy'), 'Masked key must preserve prefix');
    assert.ok(masked.endsWith('7kL9'), 'Masked key must preserve suffix');
    assert.ok(masked.includes('••••'), 'Masked key must hide middle entropy');
    assert.strictEqual(masked.includes('1234567890'), false, 'Key body must not appear');
  });

  it('should reject empty or whitespace-only API keys', async () => {
    await assert.rejects(
      async () => {
        await credentialVault.saveKey('gemini', '   ');
      },
      /API key cannot be empty/
    );
  });

  it('should store and retrieve an API key', async () => {
    const testKey = 'AIzaSyTestKey_9876543210_valid';
    await credentialVault.saveKey('gemini', testKey);

    const retrieved = await credentialVault.getKey('gemini');
    assert.strictEqual(retrieved, testKey);

    const hasKey = await credentialVault.hasKey('gemini');
    assert.strictEqual(hasKey, true);
  });

  it('should list configured providers correctly', async () => {
    await credentialVault.saveKey('gemini', 'AIzaSyGeminiKey');
    const configured = await credentialVault.listConfiguredProviders();
    assert.ok(configured.includes('gemini'));
  });

  it('should store non-secret model preferences separately from credentials', async () => {
    await credentialVault.saveSelectedModel('gemini', 'gemini-3.5-flash');
    const model = await credentialVault.getSelectedModel('gemini');
    assert.strictEqual(model, 'gemini-3.5-flash');

    // Verify key is still untouched
    const key = await credentialVault.getKey('gemini');
    assert.strictEqual(key, 'AIzaSyGeminiKey');
  });

  it('should remove credentials completely on delete', async () => {
    await credentialVault.removeKey('gemini');
    const retrieved = await credentialVault.getKey('gemini');
    assert.strictEqual(retrieved, null);

    const hasKey = await credentialVault.hasKey('gemini');
    assert.strictEqual(hasKey, false);
  });
});
