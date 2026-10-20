import { ISearchProvider, SearchOptions, SearchResponse, NormalizedSearchResult } from './types';

export class DuckDuckGoSearchProvider implements ISearchProvider {
  readonly id = 'duckduckgo';
  readonly name = 'DuckDuckGo Web Search';
  readonly isConfigured = true;

  normalizeUrl(rawUrl: string): string {
    try {
      let target = rawUrl.trim();
      // Resolve protocol-relative URLs
      if (target.startsWith('//')) {
        target = 'https:' + target;
      }

      // Handle duckduckgo redirect wrapper: //duckduckgo.com/l/?uddg=...
      if (target.includes('/l/?uddg=') || target.includes('uddg=')) {
        try {
          const parsed = new URL(target, 'https://duckduckgo.com');
          const encoded = parsed.searchParams.get('uddg');
          if (encoded) {
            target = decodeURIComponent(encoded);
          }
        } catch {
          // If URL parsing fails, extract uddg via regex
          const match = /[?&]uddg=([^&]+)/.exec(target);
          if (match) {
            target = decodeURIComponent(match[1]);
          }
        }
      }

      const parsed = new URL(target);
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

  stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Search query cannot be empty');
    }

    const limit = Math.min(options?.limit || 6, 15);
    const timeoutMs = options?.timeoutMs || 8000;
    const startTime = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`DuckDuckGo responded with HTTP ${res.status}: ${res.statusText}`);
      }

      const html = await res.text();

      // Check if DuckDuckGo challenged the request with bot protection
      if (html.includes('anomaly.js') || html.includes('challenge-form')) {
        throw new Error(
          'DuckDuckGo rate-limited or blocked this request via bot detection. Configure BRAVE_API_KEY, TAVILY_API_KEY, or SEARXNG_URL for dedicated web search.'
        );
      }

      const results: NormalizedSearchResult[] = [];
      const seenUrls = new Set<string>();

      // Extract each result block in DDG HTML markup:
      // Pattern matches: <div class="result results_links ..."> ... </div></div></div>
      const blockRegex = /<div class="result results_links[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
      let blockMatch: RegExpExecArray | null;

      while ((blockMatch = blockRegex.exec(html)) !== null && results.length < limit) {
        const content = blockMatch[1];

        // Extract title link: <a class="result__a" href="...">Title</a>
        const titleMatch = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(content);
        // Extract snippet link: <a class="result__snippet" ...>Snippet</a>
        const snippetMatch = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(content);

        if (!titleMatch) continue;

        const rawUrl = titleMatch[1];
        const cleanUrl = this.normalizeUrl(rawUrl);

        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          continue;
        }

        // Filter out sponsored advertising links
        if (
          cleanUrl.includes('duckduckgo.com/y.js') ||
          cleanUrl.includes('ad_provider=') ||
          content.includes('result--ad')
        ) {
          continue;
        }

        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const domain = this.extractDomain(cleanUrl);
        const title = this.stripHtml(titleMatch[2]);
        const snippet = snippetMatch ? this.stripHtml(snippetMatch[1]) : '';

        const rank = results.length + 1;
        results.push({
          id: rank,
          title: title || domain,
          url: cleanUrl,
          domain,
          snippet,
          faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          rank,
          retrievalStatus: 'pending',
        });
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
        throw new Error(`Search request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
