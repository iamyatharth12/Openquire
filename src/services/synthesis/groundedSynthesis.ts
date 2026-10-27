import { NormalizedSearchResult } from '../search/types';
import { validateCitations, CitationValidationResult } from './citationValidator';
import { credentialVault } from '../storage/indexedDbVault';

export interface GroundedAnswerResult {
  query: string;
  answerText: string;
  sources: NormalizedSearchResult[];
  citations: CitationValidationResult;
  provider: string;
  requestedModel: string;
  modelUsed: string;
  modelConfirmed: boolean;
  executionTimeMs: number;
  diagnosticInfo?: {
    providerId: string;
    requestedModel: string;
    modelConfirmed: boolean;
    timestamp: number;
    evidenceCount: number;
    status: 'success' | 'failed';
  };
}

export interface ResearchProgressUpdate {
  stage: 'searching' | 'retrieving' | 'synthesizing' | 'completed' | 'error';
  message: string;
  sourcesCount?: number;
}

export class GroundedSynthesisEngine {
  /**
   * Builds the formatted evidence block from retrieved sources.
   */
  private buildEvidencePrompt(sources: NormalizedSearchResult[]): string {
    return sources
      .map((s) => {
        const text = s.extractedContent || s.snippet || 'No text extracted.';
        return `[Source ${s.id}]: ${s.title}\nDomain: ${s.domain}\nURL: ${s.url}\nEvidence Content:\n${text}\n`;
      })
      .join('\n---\n\n');
  }

  /**
   * Executes the full grounded research pipeline with transparent model execution.
   */
  async executeResearch(
    query: string,
    options?: {
      onProgress?: (progress: ResearchProgressUpdate) => void;
      model?: string;
      sourcesLimit?: number;
      /** Use sources already gathered by a multi-query workflow instead of repeating the search. */
      sources?: NormalizedSearchResult[];
      signal?: AbortSignal;
      onPartialResult?: (partial: { sources?: NormalizedSearchResult[]; answerText?: string }) => void;
    }
  ): Promise<GroundedAnswerResult> {
    const startTime = Date.now();
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Research query cannot be empty.');
    }

    if (options?.signal?.aborted) {
      throw new DOMException('Research synthesis cancelled', 'AbortError');
    }

    // 1. Check user BYOK Gemini key
    const geminiKey = await credentialVault.getKey('gemini');
    if (!geminiKey || geminiKey.trim().length === 0) {
      throw new Error('NO_API_KEY: A Google Gemini API key is required in Settings to synthesize grounded answers.');
    }

    // Single source of truth: explicitly requested model, or saved preference, or discovered recommended
    let requestedModel = options?.model?.trim();
    if (!requestedModel) {
      requestedModel = (await credentialVault.getSelectedModel('gemini')) || '';
    }
    if (!requestedModel) {
      const available = await credentialVault.getAvailableModels('gemini');
      requestedModel =
        available?.find((m: any) => m.isRecommended)?.id ||
        available?.[0]?.id ||
        '';
    }
    if (!requestedModel) {
      requestedModel = 'gemini-2.5-flash';
    }

    // 2. Stage 1: Real Web Search
    options?.onProgress?.({
      stage: 'searching',
      message: options?.sources
        ? `Using ${options.sources.length} sources collected from web searches...`
        : 'Searching the web for authoritative sources...',
    });

    let sources: NormalizedSearchResult[];
    if (options?.sources) {
      sources = options.sources.slice(0, options.sourcesLimit || 12);
    } else {
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, limit: options?.sourcesLimit || 6 }),
        signal: options?.signal,
      });

      if (!searchRes.ok) {
        const err = await searchRes.json().catch(() => ({}));
        throw new Error(err.error || `Search failed with status ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      sources = searchData.results || [];
    }

    if (sources.length === 0) {
      throw new Error('No search results found for this query. Try adjusting your search terms.');
    }

    // Preserve partial search results
    options?.onPartialResult?.({ sources: [...sources] });

    if (options?.signal?.aborted) {
      throw new DOMException('Research synthesis cancelled', 'AbortError');
    }

    // 3. Stage 2: Safe Source Retrieval
    options?.onProgress?.({
      stage: 'retrieving',
      message: `Retrieving and verifying ${sources.length} sources...`,
      sourcesCount: sources.length,
    });

    const urlsToRetrieve = sources.slice(0, 4).map((s) => s.url);
    try {
      const retrieveRes = await fetch('/api/retrieve-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToRetrieve }),
        signal: options?.signal,
      });

      if (retrieveRes.ok) {
        const retrieveData = await retrieveRes.json();
        const retrievedMap = new Map<string, any>();
        (retrieveData.sources || []).forEach((r: any) => retrievedMap.set(r.url, r));

        sources = sources.map((s) => {
          const ret = retrievedMap.get(s.url);
          if (ret) {
            return {
              ...s,
              retrievalStatus: ret.status,
              extractedContent: ret.text || s.snippet,
              title: ret.title || s.title,
              retrievalError: ret.error,
            };
          }
          return s;
        });
      }
    } catch (err: any) {
      if (options?.signal?.aborted || err?.name === 'AbortError') {
        throw new DOMException('Research synthesis cancelled', 'AbortError');
      }
      // If retrieval endpoint encounters a non-abort issue, proceed with search snippets
    }

    // Preserve updated sources with retrieval content
    options?.onPartialResult?.({ sources: [...sources] });

    if (options?.signal?.aborted) {
      throw new DOMException('Research synthesis cancelled', 'AbortError');
    }

    // 4. Stage 3: Grounded Answer Synthesis (Exact requested model, NO silent substitution)
    options?.onProgress?.({
      stage: 'synthesizing',
      message: `Synthesizing grounded answer with ${requestedModel}...`,
      sourcesCount: sources.length,
    });

    const evidenceText = this.buildEvidencePrompt(sources);

    const systemPrompt = `You are Openquire, an intelligent, evidence-based web research engine.
Your task is to synthesize a comprehensive, rigorous answer to the user's research query using ONLY the numbered evidence sources provided below.

MANDATORY CITATION RULES:
1. Every factual statement and key assertion MUST be immediately followed by a citation pin using bracketed numbers, e.g., [1], [2], or [1][3].
2. Cite ONLY valid source numbers that exist in the provided evidence (Source 1 to Source ${sources.length}).
3. Never invent citations. If multiple sources corroborate a claim, cite all of them: [1][2].
4. If the provided sources do not contain enough facts to answer a specific aspect of the question, clearly state that limitation.
5. Structure your output clearly: Start with an Executive Summary paragraph, followed by a numbered "Key Insights" section with detailed paragraphs.`;

    const userPrompt = `User Research Query: "${trimmed}"\n\nVerified Evidence Sources:\n${evidenceText}\n\nPlease generate the grounded research answer following all citation rules.`;

    const cleanKey = geminiKey.trim();
    const encodedModel = encodeURIComponent(requestedModel);
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`;
    const genRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': cleanKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for high factual grounding
          topP: 0.95,
        },
      }),
      signal: options?.signal,
    });

    if (!genRes.ok) {
      let errJson: any = null;
      try {
        errJson = await genRes.json();
      } catch {}
      const msg = errJson?.error?.message || `Gemini API returned HTTP ${genRes.status}`;
      if (genRes.status === 404) {
        throw new Error(
          `MODEL_NOT_FOUND (${requestedModel}): The model "${requestedModel}" was not found or is not available for this API key. Please select a valid model from the composer or Settings.`
        );
      }
      if (genRes.status === 400 || genRes.status === 401 || genRes.status === 403) {
        if (msg.toLowerCase().includes('key') || msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('unregistered')) {
          throw new Error(
            `INVALID_KEY: The Google Gemini API key is invalid or unauthorized. Please verify or update your key in Settings.`
          );
        }
      }
      if (genRes.status === 429) {
        throw new Error(
          `QUOTA_EXCEEDED: Gemini API rate limit or quota exceeded for this model. Please wait a moment or try another model.`
        );
      }
      // NO SILENT SUBSTITUTION: Report exact requested model failure
      throw new Error(`MODEL_ERROR (${requestedModel}): ${msg}`);
    }

    const genData = await genRes.json();
    const candidate = genData?.candidates?.[0];
    const answerText = candidate?.content?.parts?.[0]?.text || '';
    if (!answerText) {
      throw new Error(`The model "${requestedModel}" returned an empty response.`);
    }

    // 5. Citation Validation
    const citationValidation = validateCitations(answerText, sources);

    // Update citation frequencies on each source
    const countMap = new Map<number, number>();
    citationValidation.citations.forEach((c) => {
      if (c.isValid) {
        countMap.set(c.sourceId, (countMap.get(c.sourceId) || 0) + 1);
      }
    });

    const finalSources = sources.map((s) => ({
      ...s,
      citationsCount: countMap.get(s.id) || 0,
    }));

    options?.onProgress?.({
      stage: 'completed',
      message: 'Grounded research synthesis complete.',
      sourcesCount: finalSources.length,
    });

    return {
      query: trimmed,
      answerText,
      sources: finalSources,
      citations: citationValidation,
      provider: 'Google Gemini',
      requestedModel,
      modelUsed: requestedModel,
      modelConfirmed: true,
      executionTimeMs: Date.now() - startTime,
      diagnosticInfo: {
        providerId: 'gemini',
        requestedModel,
        modelConfirmed: true,
        timestamp: startTime,
        evidenceCount: finalSources.length,
        status: 'success',
      },
    };
  }
}

export const groundedSynthesis = new GroundedSynthesisEngine();
