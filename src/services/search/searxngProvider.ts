import { ISearchProvider, SearchOptions, SearchResponse, NormalizedSearchResult } from './types';

export class SearxngSearchProvider implements ISearchProvider {
  readonly id = 'searxng';
  readonly name = 'SearXNG';
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || (typeof process !== 'undefined' ? process.env?.SEARXNG_URL || '' : '');
  }

  get isConfigured(): boolean {
    return Boolean(this.endpoint && this.endpoint.trim().length > 0);
  }

  /**
   * Normalizes URLs to prevent duplicate sources (strips tracking query params, trailing slashes).
   */
  normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      // Remove standard analytics tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      
      // Normalize pathname
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      parsed.pathname = pathname;

      return parsed.toString();
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Extracts clean hostname from URL.
   */
  extractDomain(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return 'web';
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Search query cannot be empty');
    }

    if (!this.isConfigured) {
      throw new Error(
        'SearXNG is not configured. Set the SEARXNG_URL environment variable to your SearXNG instance URL, or use a zero-configuration provider like DuckDuckGo.'
      );
    }

    const limit = Math.min(options?.limit || 8, 20);
    const timeoutMs = options?.timeoutMs || 8000;
    const startTime = Date.now();

    const searchUrl = new URL('/search', this.endpoint);
    searchUrl.searchParams.set('q', trimmed);
    searchUrl.searchParams.set('format', 'json');
    if (options?.language) {
      searchUrl.searchParams.set('language', options.language);
    }
    if (options?.safeSearch !== undefined) {
      searchUrl.searchParams.set('safesearch', options.safeSearch ? '1' : '0');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Openquire-Research-Engine/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`SearXNG service responded with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.results)) {
        return {
          query: trimmed,
          provider: this.name,
          results: [],
          totalResults: 0,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const seenUrls = new Set<string>();
      const normalizedResults: NormalizedSearchResult[] = [];

      for (const item of data.results) {
        if (!item.url || typeof item.url !== 'string') continue;
        const cleanUrl = this.normalizeUrl(item.url);

        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const domain = this.extractDomain(cleanUrl);
        const rank = normalizedResults.length + 1;

        normalizedResults.push({
          id: rank,
          title: (item.title || domain).trim(),
          url: cleanUrl,
          domain,
          snippet: (item.content || item.snippet || '').trim(),
          faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          publishedDate: item.publishedDate || undefined,
          rank,
          retrievalStatus: 'pending',
        });

        if (normalizedResults.length >= limit) break;
      }

      return {
        query: trimmed,
        provider: this.name,
        results: normalizedResults,
        totalResults: data.number_of_results || normalizedResults.length,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Search request to SearXNG timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
