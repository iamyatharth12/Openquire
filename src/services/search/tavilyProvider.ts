import { ISearchProvider, SearchOptions, SearchResponse, NormalizedSearchResult } from './types';

export class TavilySearchProvider implements ISearchProvider {
  readonly id = 'tavily';
  readonly name = 'Tavily AI Search';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.TAVILY_API_KEY || '' : '');
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
        'Tavily Search is not configured. Set the TAVILY_API_KEY environment variable (obtain free at tavily.com).'
      );
    }

    const limit = Math.min(options?.limit || 6, 15);
    const timeoutMs = options?.timeoutMs || 8000;
    const startTime = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: trimmed,
          max_results: limit,
          search_depth: 'basic',
          include_answer: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Tavily Search API responded with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawList = data?.results || [];
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
          snippet: item.content || '',
          extractedContent: item.content || undefined,
          faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
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
        throw new Error(`Tavily Search timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
