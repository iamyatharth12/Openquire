import { validateSafeUrl, BlockedDestinationError } from './ssrfGuard';
import { extractTextFromHtml } from './htmlExtractor';

export interface RetrievedSource {
  url: string;
  status: 'retrieved' | 'blocked' | 'failed' | 'unsupported';
  title?: string;
  text?: string;
  error?: string;
  byteSize?: number;
}

const MAX_PAGE_SIZE = 2.5 * 1024 * 1024; // 2.5MB limit
const RETRIEVAL_TIMEOUT_MS = 6000;  // 6s per page
const MAX_REDIRECTS = 3;

export async function retrieveSourcePage(targetUrl: string): Promise<RetrievedSource> {
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= MAX_REDIRECTS) {
    // 1. SSRF check
    try {
      await validateSafeUrl(currentUrl);
    } catch (err: any) {
      return {
        url: targetUrl,
        status: 'blocked',
        error: err instanceof BlockedDestinationError ? err.message : 'URL blocked by safety policy.',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RETRIEVAL_TIMEOUT_MS);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenquireBot/1.0; +https://openquire.ai)',
          Accept: 'text/html, text/plain;q=0.9',
        },
        redirect: 'manual', // Manual redirect control to validate each hop against SSRF guard
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle redirect status codes 301, 302, 303, 307, 308
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) {
          return { url: targetUrl, status: 'failed', error: 'Redirect location header missing.' };
        }
        redirectsCount++;
        if (redirectsCount > MAX_REDIRECTS) {
          return { url: targetUrl, status: 'failed', error: 'Exceeded maximum redirect limit (3).' };
        }
        // Resolve relative redirects against current URL
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!res.ok) {
        return {
          url: targetUrl,
          status: 'failed',
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      // Check Content-Type
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return {
          url: targetUrl,
          status: 'unsupported',
          error: `Unsupported content type "${contentType}".`,
        };
      }

      // Read bounded body
      let rawText = await res.text();
      if (rawText.length > MAX_PAGE_SIZE) {
        rawText = rawText.slice(0, MAX_PAGE_SIZE);
      }

      const extracted = extractTextFromHtml(rawText);

      return {
        url: targetUrl,
        status: 'retrieved',
        title: extracted.title,
        text: extracted.textContent,
        byteSize: extracted.byteLength,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return {
          url: targetUrl,
          status: 'failed',
          error: `Retrieval timed out after ${RETRIEVAL_TIMEOUT_MS}ms.`,
        };
      }
      return {
        url: targetUrl,
        status: 'failed',
        error: err.message || 'Failed to retrieve page.',
      };
    }
  }

  return {
    url: targetUrl,
    status: 'failed',
    error: 'Too many redirects.',
  };
}

export async function retrieveBatchSources(urls: string[], concurrency = 3): Promise<RetrievedSource[]> {
  const results: RetrievedSource[] = [];
  const queue = [...urls];

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }).map(async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const res = await retrieveSourcePage(url);
      results.push(res);
    }
  });

  await Promise.all(workers);
  return results;
}
