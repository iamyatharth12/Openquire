import { NormalizedSearchResult } from '../search/types';

export interface SourceDisplayItem {
  id: number;
  name: string;
  domain: string;
  initials: string;
  bgClass: string;
  accentColor: string;
  title: string;
  excerpt: string;
  citationsCount: number;
  verified: boolean;
  retrievalStatus?: 'pending' | 'retrieved' | 'blocked' | 'failed' | 'unsupported';
  faviconUrl?: string;
  url: string;
}

/**
 * Extracts a human-readable brand name from a domain name.
 * Correctly handles multi-part TLDs like .co.uk, .gov.uk, .org.au, etc.
 */
export function extractBrandName(domain: string): string {
  if (!domain || domain === 'web') return 'Web Source';
  if (domain.includes('wikipedia.org')) return 'Wikipedia';

  // Strip leading www.
  const clean = domain.toLowerCase().replace(/^www\./, '');
  // Match multi-part TLDs (e.g. .co.uk, .com.au, .gov.uk) or standard TLDs (.org, .com, .edu)
  const tldRegex = /\.(co|gov|edu|org|com|net|ac|mil)\.[a-z]{2}$|\.[a-z]{2,12}$/i;
  const withoutTld = clean.replace(tldRegex, '');
  const parts = withoutTld.split('.');
  const brand = parts[parts.length - 1] || clean;

  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/**
 * Generates deterministic visual brand initials (up to 3 uppercase letters).
 */
export function extractBrandInitials(brandName: string): string {
  const words = brandName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return brandName.slice(0, 3).toUpperCase();
}

/**
 * Maps normalized search results into display items with verified provenance.
 * Preserves true citation counts, retrieval statuses, and real excerpts.
 */
export function createSourceItemFromNormalized(raw: NormalizedSearchResult): SourceDisplayItem {
  const brandName = extractBrandName(raw.domain);
  const initials = extractBrandInitials(brandName);

  const colors = [
    'bg-[#004B87] text-white',
    'bg-[#051C2C] text-white',
    'bg-[#0A4D8C] text-white',
    'bg-[#2A4365] text-white',
    'bg-[#1A365D] text-white',
    'bg-[#2C3E50] text-white',
    'bg-[#191919] text-white',
  ];
  const bgClass = colors[raw.id % colors.length];

  // Derive excerpt strictly from actual retrieved content or snippet
  const actualExcerpt =
    raw.extractedContent?.trim()?.slice(0, 240) ||
    raw.snippet?.trim() ||
    'No text excerpt available from this source.';

  return {
    id: raw.id,
    name: brandName,
    domain: raw.domain,
    initials,
    bgClass,
    accentColor: '#004B87',
    title: raw.title || raw.domain,
    excerpt: actualExcerpt,
    citationsCount: raw.citationsCount ?? 0,
    verified: raw.retrievalStatus === 'retrieved',
    retrievalStatus: raw.retrievalStatus || 'pending',
    faviconUrl: raw.faviconUrl || `https://www.google.com/s2/favicons?domain=${raw.domain}&sz=64`,
    url: raw.url,
  };
}

export interface RetrievalStatusInfo {
  dotClass: string;
  label: string;
  title: string;
}

/**
 * Returns accurate UI indicators for source retrieval verification.
 * Avoids misrepresenting snippet-only or unverified sources as independently fact-checked.
 */
export function getRetrievalStatusBadge(status?: string, verified?: boolean): RetrievalStatusInfo {
  if (status === 'retrieved' || (status === undefined && verified === true)) {
    return {
      dotClass: 'bg-emerald-500',
      label: 'Page Retrieved',
      title: 'Full webpage text retrieved, sanitized, and security validated',
    };
  }
  if (status === 'blocked') {
    return {
      dotClass: 'bg-amber-500',
      label: 'Security Blocked',
      title: 'Source retrieval blocked by SSRF and private IP protection policy',
    };
  }
  if (status === 'failed') {
    return {
      dotClass: 'bg-rose-500',
      label: 'Fetch Failed',
      title: 'Source webpage retrieval failed; using search snippet fallback',
    };
  }
  return {
    dotClass: 'bg-sky-500',
    label: 'Search Snippet',
    title: 'Search engine snippet only (webpage not yet fetched)',
  };
}
