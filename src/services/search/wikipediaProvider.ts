import { ISearchProvider, SearchOptions, SearchResponse, NormalizedSearchResult } from './types';

export class WikipediaSearchProvider implements ISearchProvider {
  readonly id = 'wikipedia';
  readonly name = 'Wikipedia Knowledge & Research';
  readonly isConfigured = true;

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Search query cannot be empty');
    }

    const limit = Math.min(options?.limit || 6, 12);
    const startTime = Date.now();

    // 1. Query search
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      trimmed
    )}&format=json&srlimit=${limit}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Openquire-Research-Engine/1.0 (https://openquire.ai; contact@openquire.ai)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Wikipedia search API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data?.query?.search || [];

    // 2. Fetch page extracts in batch for rich evidence
    const titles = items.map((i: any) => i.title);
    const extractsMap = new Map<string, string>();

    if (titles.length > 0) {
      try {
        const extractsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(
          titles.join('|')
        )}&format=json`;
        const extRes = await fetch(extractsUrl, {
          headers: { 'User-Agent': 'Openquire-Research-Engine/1.0' },
        });
        if (extRes.ok) {
          const extData = await extRes.json();
          const pages = extData?.query?.pages || {};
          Object.values(pages).forEach((p: any) => {
            if (p.title && p.extract) {
              extractsMap.set(p.title, p.extract);
            }
          });
        }
      } catch {
        // Fall back to search snippets if extract fails
      }
    }

    const results: NormalizedSearchResult[] = items.map((item: any, idx: number) => {
      const rank = idx + 1;
      const cleanSnippet = this.stripHtml(item.snippet || '');
      const fullExtract = extractsMap.get(item.title);
      const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`;

      return {
        id: rank,
        title: item.title,
        url: articleUrl,
        domain: 'wikipedia.org',
        snippet: cleanSnippet || (fullExtract ? fullExtract.slice(0, 200) + '...' : ''),
        faviconUrl: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        rank,
        retrievalStatus: 'retrieved' as const,
        extractedContent: fullExtract || cleanSnippet,
        publishedDate: item.timestamp,
      };
    });

    return {
      query: trimmed,
      provider: this.name,
      results,
      totalResults: data?.query?.searchinfo?.totalhits || results.length,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
