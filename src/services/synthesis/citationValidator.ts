import { NormalizedSearchResult } from '../search/types';

export interface CitationReference {
  sourceId: number;
  source?: NormalizedSearchResult;
  isValid: boolean;
  rawMarker: string; // e.g. "[1]"
  index: number;
}

export interface CitationValidationResult {
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  integrityPercentage: number;
  citedSourceIds: number[];
  citations: CitationReference[];
  flaggedErrors: string[];
}

/**
 * Validates inline citations (e.g. [1], [2], [1][2]) against the verified sources list.
 */
export function validateCitations(
  text: string,
  sources: NormalizedSearchResult[]
): CitationValidationResult {
  const validSourceMap = new Map<number, NormalizedSearchResult>();
  sources.forEach((s) => validSourceMap.set(s.id, s));

  const citationRegex = /\[(\d+)\]/g;
  const citations: CitationReference[] = [];
  const citedSourceIdsSet = new Set<number>();
  const flaggedErrors: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = citationRegex.exec(text)) !== null) {
    const rawMarker = match[0];
    const sourceId = parseInt(match[1], 10);
    const isValid = validSourceMap.has(sourceId);

    if (isValid) {
      citedSourceIdsSet.add(sourceId);
    } else {
      flaggedErrors.push(`Unknown citation marker "${rawMarker}" (Source ID ${sourceId} not in evidence package)`);
    }

    citations.push({
      sourceId,
      source: validSourceMap.get(sourceId),
      isValid,
      rawMarker,
      index: match.index,
    });
  }

  const totalCitations = citations.length;
  const validCitations = citations.filter((c) => c.isValid).length;
  const invalidCitations = totalCitations - validCitations;
  const integrityPercentage =
    totalCitations > 0 ? Math.round((validCitations / totalCitations) * 1000) / 10 : 100;

  return {
    totalCitations,
    validCitations,
    invalidCitations,
    integrityPercentage,
    citedSourceIds: Array.from(citedSourceIdsSet).sort((a, b) => a - b),
    citations,
    flaggedErrors,
  };
}
