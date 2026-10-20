import dns from 'node:dns/promises';
import net from 'node:net';

export class BlockedDestinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedDestinationError';
  }
}

/**
 * Checks whether an IPv4 address falls into private, loopback, link-local, or broadcast ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is blocked
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local, AWS/GCP metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 255.255.255.255 (Broadcast)
  if (ip === '255.255.255.255') return true;

  return false;
}

/**
 * Checks whether an IPv6 address falls into loopback, unique local, or link-local ranges.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback ::1 or ::
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:192.168.1.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Unique local fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local fe80::/10 (fe80:: - febf::)
  if (/^fe[89ab]/i.test(normalized)) return true;

  return false;
}

/**
 * Validates a target URL against SSRF and destination constraints.
 * Throws BlockedDestinationError if forbidden.
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedDestinationError('Malformed URL provided.');
  }

  // Enforce HTTP / HTTPS only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedDestinationError(`Protocol "${parsed.protocol}" is not permitted. Only HTTP/HTTPS is allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard internal names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.onion') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new BlockedDestinationError(`Destination hostname "${hostname}" is within a restricted local or internal zone.`);
  }

  // Check if hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
      throw new BlockedDestinationError(`Direct connection to private IP "${hostname}" is prohibited.`);
    }
    if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
      throw new BlockedDestinationError(`Direct connection to private IPv6 "${hostname}" is prohibited.`);
    }
    return parsed;
  }

  // Resolve hostname via DNS and check resolved IP
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new BlockedDestinationError(`Domain "${hostname}" resolved to prohibited private IP ${record.address}.`);
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new BlockedDestinationError(`Domain "${hostname}" resolved to prohibited private IPv6 ${record.address}.`);
      }
    }
  } catch (err: any) {
    if (err instanceof BlockedDestinationError) throw err;
    throw new BlockedDestinationError(`DNS lookup failed for "${hostname}": ${err.message}`);
  }

  return parsed;
}
