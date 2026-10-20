import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPrivateIPv4, isPrivateIPv6, validateSafeUrl, BlockedDestinationError } from '../server/ssrfGuard';

describe('SSRF Guard & Internal IP Range Protection', () => {
  it('should identify private IPv4 ranges accurately', () => {
    // Loopback
    assert.strictEqual(isPrivateIPv4('127.0.0.1'), true);
    assert.strictEqual(isPrivateIPv4('127.255.255.255'), true);

    // Private Class A (10.0.0.0/8)
    assert.strictEqual(isPrivateIPv4('10.0.0.1'), true);
    assert.strictEqual(isPrivateIPv4('10.255.0.1'), true);

    // Private Class B (172.16.0.0/12)
    assert.strictEqual(isPrivateIPv4('172.16.0.1'), true);
    assert.strictEqual(isPrivateIPv4('172.31.255.255'), true);
    assert.strictEqual(isPrivateIPv4('172.32.0.1'), false); // Public

    // Private Class C (192.168.0.0/16)
    assert.strictEqual(isPrivateIPv4('192.168.1.1'), true);

    // Link-local / Cloud metadata (169.254.169.254)
    assert.strictEqual(isPrivateIPv4('169.254.169.254'), true);

    // Public IPs
    assert.strictEqual(isPrivateIPv4('8.8.8.8'), false);
    assert.strictEqual(isPrivateIPv4('1.1.1.1'), false);
  });

  it('should identify private IPv6 ranges accurately', () => {
    assert.strictEqual(isPrivateIPv6('::1'), true); // Loopback
    assert.strictEqual(isPrivateIPv6('::'), true);  // Unspecified
    assert.strictEqual(isPrivateIPv6('fe80::1'), true); // Link-local
    assert.strictEqual(isPrivateIPv6('fc00::1'), true); // Unique local
    assert.strictEqual(isPrivateIPv6('::ffff:127.0.0.1'), true); // IPv4-mapped loopback
  });

  it('should block non-http/https protocols', async () => {
    await assert.rejects(
      async () => {
        await validateSafeUrl('file:///etc/passwd');
      },
      /Protocol "file:" is not permitted/
    );

    await assert.rejects(
      async () => {
        await validateSafeUrl('gopher://127.0.0.1');
      },
      /Protocol "gopher:" is not permitted/
    );
  });

  it('should block localhost and internal domain names', async () => {
    await assert.rejects(
      async () => {
        await validateSafeUrl('http://localhost:8080');
      },
      /restricted local or internal zone/
    );

    await assert.rejects(
      async () => {
        await validateSafeUrl('http://metadata.google.internal/computeMetadata/v1/');
      },
      /restricted local or internal zone/
    );
  });

  it('should permit valid public URLs', async () => {
    const parsed = await validateSafeUrl('https://example.com/research-paper');
    assert.strictEqual(parsed.hostname, 'example.com');
  });
});
