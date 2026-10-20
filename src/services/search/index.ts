import { ISearchProvider, SearchOptions, SearchResponse } from './types';
import { SearxngSearchProvider } from './searxngProvider';
import { DuckDuckGoSearchProvider } from './duckduckgoProvider';
import { BraveSearchProvider } from './braveProvider';
import { TavilySearchProvider } from './tavilyProvider';
import { WikipediaSearchProvider } from './wikipediaProvider';

export * from './types';
export { SearxngSearchProvider } from './searxngProvider';
export { DuckDuckGoSearchProvider } from './duckduckgoProvider';
export { BraveSearchProvider } from './braveProvider';
export { TavilySearchProvider } from './tavilyProvider';
export { WikipediaSearchProvider } from './wikipediaProvider';

/**
 * ResilientSearchProvider chains web search engines without silently replacing general web search with Wikipedia.
 */
export class ResilientSearchProvider implements ISearchProvider {
  readonly id = 'resilient-composite';
  readonly name = 'Resilient Web Search';
  readonly isConfigured = true;

  private primary: ISearchProvider;
  private fallback?: ISearchProvider;

  constructor(primary?: ISearchProvider, fallback?: ISearchProvider) {
    this.primary = primary || new DuckDuckGoSearchProvider();
    this.fallback = fallback;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    let primaryError: Error | null = null;

    try {
      const res = await this.primary.search(query, options);
      if (res && res.results && res.results.length > 0) {
        return res;
      }
      console.warn(`[Search] ${this.primary.name} returned 0 results.`);
    } catch (err: any) {
      primaryError = err;
      console.warn(`[Search] ${this.primary.name} failed: ${err.message}`);
    }

    if (this.fallback) {
      try {
        console.warn(`[Search] Attempting fallback provider: ${this.fallback.name}...`);
        const fallbackRes = await this.fallback.search(query, options);
        if (fallbackRes && fallbackRes.results && fallbackRes.results.length > 0) {
          return fallbackRes;
        }
      } catch (fallbackErr: any) {
        console.warn(`[Search] Fallback provider ${this.fallback.name} failed: ${fallbackErr.message}`);
        throw new Error(
          `Live web search failed across providers. Primary (${this.primary.name}): ${primaryError?.message || 'No results'}. Fallback (${this.fallback.name}): ${fallbackErr.message}.`
        );
      }
    }

    if (primaryError) {
      throw primaryError;
    }

    return {
      query,
      provider: this.primary.name,
      results: [],
      totalResults: 0,
      executionTimeMs: 0,
    };
  }
}

/**
 * Determines and returns the active search provider based on environment configuration.
 *
 * Priority order:
 * 1. DEFAULT_SEARCH_PROVIDER explicit override (brave, tavily, searxng, duckduckgo, wikipedia)
 * 2. BRAVE_API_KEY -> Brave Web Search (free tier: 2,000 queries/month, no infrastructure)
 * 3. TAVILY_API_KEY -> Tavily AI Search (free tier: 1,000 queries/month, optimized for LLMs)
 * 4. SEARXNG_URL -> SearXNG self-hosted metasearch
 * 5. Default -> DuckDuckGo Web Search (zero configuration, no deployment needed)
 */
export function getActiveSearchProvider(): ISearchProvider {
  const env = typeof process !== 'undefined' ? process.env : {};
  const explicitProvider = env?.DEFAULT_SEARCH_PROVIDER?.toLowerCase().trim();

  // 1. Explicit override
  if (explicitProvider) {
    switch (explicitProvider) {
      case 'brave':
        return new BraveSearchProvider();
      case 'tavily':
        return new TavilySearchProvider();
      case 'searxng':
        return new SearxngSearchProvider();
      case 'duckduckgo':
        return new DuckDuckGoSearchProvider();
      case 'wikipedia':
        // Explicit encyclopedia mode (not silent fallback)
        return new WikipediaSearchProvider();
      default:
        console.warn(`Unknown DEFAULT_SEARCH_PROVIDER "${explicitProvider}", using auto-detection.`);
    }
  }

  // 2. Brave Search API (if key is provided)
  const braveKey = env?.BRAVE_API_KEY?.trim();
  if (braveKey && braveKey.length > 0) {
    return new ResilientSearchProvider(
      new BraveSearchProvider(braveKey),
      new DuckDuckGoSearchProvider()
    );
  }

  // 3. Tavily Search API (if key is provided)
  const tavilyKey = env?.TAVILY_API_KEY?.trim();
  if (tavilyKey && tavilyKey.length > 0) {
    return new ResilientSearchProvider(
      new TavilySearchProvider(tavilyKey),
      new DuckDuckGoSearchProvider()
    );
  }

  // 4. SearXNG (if custom instance URL is provided)
  const searxngUrl = env?.SEARXNG_URL?.trim();
  if (searxngUrl && searxngUrl.length > 0) {
    return new ResilientSearchProvider(
      new SearxngSearchProvider(searxngUrl),
      new DuckDuckGoSearchProvider()
    );
  }

  // 5. Default zero-configuration web search
  return new DuckDuckGoSearchProvider();
}
