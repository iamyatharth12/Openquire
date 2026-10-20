/**
 * Openquire Search Provider Abstraction & Normalized Result Contracts.
 * Designed to support SearXNG and other pluggable search engines.
 */

export interface NormalizedSearchResult {
  id: number; // Stable 1-based index used for citation tagging [1], [2]
  title: string;
  url: string;
  domain: string;
  snippet: string;
  faviconUrl?: string;
  publishedDate?: string;
  rank: number;
  retrievalStatus: 'pending' | 'retrieved' | 'blocked' | 'failed' | 'unsupported';
  extractedContent?: string;
  retrievalError?: string;
  citationsCount?: number;
}

export interface SearchOptions {
  limit?: number;
  safeSearch?: boolean;
  timeoutMs?: number;
  language?: string;
}

export interface SearchResponse {
  query: string;
  provider: string;
  results: NormalizedSearchResult[];
  totalResults?: number;
  executionTimeMs: number;
}

export interface ISearchProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
}
