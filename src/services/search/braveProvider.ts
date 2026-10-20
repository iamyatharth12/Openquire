import { ISearchProvider, SearchOptions, SearchResponse, NormalizedSearchResult } from './types';

export class BraveSearchProvider implements ISearchProvider {
  readonly id = 'brave';
  readonly name = 'Brave Web Search';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.BRAVE_API_KEY || '' : '');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
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
        'Brave Search is not configured. Set the BRAVE_API_KEY environment variable (obtain free at brave.com/search/api).'
      );
    }

    const limit = Math.min(options?.limit || 6, 15);
    const timeoutMs = options?.timeoutMs || 8000;
    const startTime = Date.now();

    const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
    searchUrl.searchParams.set('q', trimmed);
    searchUrl.searchParams.set('count', String(limit));
    if (options?.safeSearch !== undefined) {
      searchUrl.searchParams.set('safesearch', options.safeSearch ? 'strict' : 'off');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Brave Search API responded with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawList = data?.web?.results || [];
      const results: NormalizedSearchResult[] = [];
      const seenUrls = new Set<string>();

      for (const item of rawList) {
        if (!item?.url || !item?.title) continue;
        const cleanUrl = this.normalizeUrl(item.url);
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const domain = this.extractDomain(cleanUrl);
        const rank = results.length + 1;

        results.push({
          id: rank,
          title: item.title,
          url: cleanUrl,
          domain,
          snippet: item.description || '',
          faviconUrl: item.profile?.img || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          publishedDate: item.page_age || undefined,
          rank,
          retrievalStatus: 'pending',
        });

        if (results.length >= limit) break;
      }

      return {
        query: trimmed,
        provider: this.name,
        results,
        totalResults: results.length,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Brave Search timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
