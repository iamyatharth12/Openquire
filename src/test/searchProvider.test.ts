import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SearxngSearchProvider } from '../services/search/searxngProvider';
import { DuckDuckGoSearchProvider } from '../services/search/duckduckgoProvider';
import { BraveSearchProvider } from '../services/search/braveProvider';
import { TavilySearchProvider } from '../services/search/tavilyProvider';
import { WikipediaSearchProvider } from '../services/search/wikipediaProvider';
import { ResilientSearchProvider } from '../services/search/index';

describe('SearXNG Search Provider & Normalization', () => {
  const configuredProvider = new SearxngSearchProvider('http://localhost:8888');
  const unconfiguredProvider = new SearxngSearchProvider('');

  it('should clean and normalize URLs, stripping tracking query parameters', () => {
    const raw = 'https://example.com/research/paper/?utm_source=twitter&utm_medium=social&fbclid=12345#overview';
    const cleaned = configuredProvider.normalizeUrl(raw);

    assert.strictEqual(cleaned.includes('utm_source'), false);
    assert.strictEqual(cleaned.includes('fbclid'), false);
    assert.strictEqual(cleaned.startsWith('https://example.com/research/paper'), true);
  });

  it('should extract clean root domains', () => {
    assert.strictEqual(configuredProvider.extractDomain('https://www.weforum.org/reports/2025'), 'weforum.org');
    assert.strictEqual(configuredProvider.extractDomain('http://subdomain.harvard.edu/article'), 'subdomain.harvard.edu');
  });

  it('should reject empty search queries', async () => {
    await assert.rejects(
      async () => {
        await configuredProvider.search('   ');
      },
      /Search query cannot be empty/
    );
  });

  it('should throw clear error when SearXNG is unconfigured without an endpoint', async () => {
    assert.strictEqual(unconfiguredProvider.isConfigured, false);
    await assert.rejects(
      async () => {
        await unconfiguredProvider.search('quantum computing');
      },
      /SearXNG is not configured/
    );
  });
});

describe('DuckDuckGo Web Search Provider', () => {
  const provider = new DuckDuckGoSearchProvider();

  it('should normalize URLs and decode uddg redirect wrappers', () => {
    const raw = '//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.nature.com%2Farticles%2Fs41586-024-001&rut=xyz';
    const cleaned = provider.normalizeUrl(raw);

    assert.strictEqual(cleaned.startsWith('https://www.nature.com/articles/s41586-024-001'), true);
    assert.strictEqual(cleaned.includes('uddg'), false);
  });

  it('should strip tracking parameters from web URLs', () => {
    const raw = 'https://www.technologyreview.com/2025/ai/?utm_campaign=daily&utm_source=email';
    const cleaned = provider.normalizeUrl(raw);

    assert.strictEqual(cleaned.includes('utm_campaign'), false);
    assert.strictEqual(cleaned, 'https://www.technologyreview.com/2025/ai');
  });

  it('should extract clean root domains from URLs', () => {
    assert.strictEqual(provider.extractDomain('https://www.nature.com/articles'), 'nature.com');
    assert.strictEqual(provider.extractDomain('https://sciencedirect.com/journal'), 'sciencedirect.com');
  });

  it('should reject empty queries', async () => {
    await assert.rejects(
      async () => {
        await provider.search('   ');
      },
      /Search query cannot be empty/
    );
  });
});

describe('Brave & Tavily Search Providers (API Key Validation)', () => {
  it('should reject unconfigured Brave Search with clear guidance', async () => {
    const brave = new BraveSearchProvider('');
    assert.strictEqual(brave.isConfigured, false);
    await assert.rejects(
      async () => {
        await brave.search('energy transition');
      },
      /Brave Search is not configured\. Set the BRAVE_API_KEY environment variable/
    );
  });

  it('should reject unconfigured Tavily Search with clear guidance', async () => {
    const tavily = new TavilySearchProvider('');
    assert.strictEqual(tavily.isConfigured, false);
    await assert.rejects(
      async () => {
        await tavily.search('energy transition');
      },
      /Tavily Search is not configured\. Set the TAVILY_API_KEY environment variable/
    );
  });
});

describe('Resilient Search Provider & Error Propagation', () => {
  it('should fallback to secondary web provider when primary fails', async () => {
    const failingPrimary = {
      id: 'failing',
      name: 'Failing Provider',
      isConfigured: true,
      search: async () => {
        throw new Error('Primary engine rate limit');
      },
    };

    const mockFallback = {
      id: 'mock-fallback',
      name: 'Mock Fallback',
      isConfigured: true,
      search: async (q: string) => ({
        query: q,
        provider: 'Mock Fallback',
        results: [
          {
            id: 1,
            title: 'Test Article',
            url: 'https://example.com/test',
            domain: 'example.com',
            snippet: 'Test snippet',
            rank: 1,
            retrievalStatus: 'ready' as const,
          },
        ],
        totalResults: 1,
        executionTimeMs: 10,
      }),
    };

    const resilient = new ResilientSearchProvider(failingPrimary as any, mockFallback as any);
    const result = await resilient.search('climate change');

    assert.strictEqual(result.provider, 'Mock Fallback');
    assert.strictEqual(result.results.length, 1);
    assert.strictEqual(result.results[0].title, 'Test Article');
  });

  it('should report clear combined error when both providers fail without silent substitution', async () => {
    const failingPrimary = {
      id: 'primary',
      name: 'Primary Engine',
      isConfigured: true,
      search: async () => {
        throw new Error('Primary timeout');
      },
    };

    const failingFallback = {
      id: 'fallback',
      name: 'Fallback Engine',
      isConfigured: true,
      search: async () => {
        throw new Error('Fallback connection refused');
      },
    };

    const resilient = new ResilientSearchProvider(failingPrimary as any, failingFallback as any);
    await assert.rejects(
      async () => {
        await resilient.search('test query');
      },
      /Live web search failed across providers/
    );
  });
});

describe('Wikipedia Knowledge Provider', () => {
  it('should reject empty search queries in Wikipedia provider', async () => {
    const wiki = new WikipediaSearchProvider();
    await assert.rejects(
      async () => {
        await wiki.search('');
      },
      /Search query cannot be empty/
    );
  });
});
