import {
  IProviderAdapter,
  ProviderMetadata,
  ProviderModel,
  ValidationResult,
  NormalizedError,
} from './types';

// Documented verified Gemini models
const DOCUMENTED_GEMINI_MODELS: ProviderModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'High-speed multimodal reasoning model with exceptional latency and high availability',
    contextWindow: '1M tokens',
    isRecommended: true,
    capabilities: { text: true, reasoning: true, vision: true },
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning foundation model for complex multi-vector research',
    contextWindow: '2M tokens',
    isRecommended: false,
    capabilities: { text: true, reasoning: true, vision: true },
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    description: 'Dynamic alias pointing directly to the latest stable Gemini Flash foundation model',
    contextWindow: '1M tokens',
    isRecommended: false,
    capabilities: { text: true, reasoning: true, vision: true },
  },
];

export class GeminiProviderAdapter implements IProviderAdapter {
  readonly metadata: ProviderMetadata = {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Gemini 2.5 Flash, Gemini 2.5 Pro, 1M+ Context',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    supportedModels: DOCUMENTED_GEMINI_MODELS,
    isImplemented: true,
    requiresRelay: false, // Direct browser CORS is supported by Google Generative Language API
    securityNote:
      'Direct browser-to-Google calls. Your key connects straight to generativelanguage.googleapis.com without third-party relays.',
  };

  /**
   * Redacts sensitive key patterns from strings to prevent accidental leakage in errors.
   */
  private redactSecrets(text: string): string {
    return text
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]');
  }

  async validateCredential(apiKey: string): Promise<ValidationResult> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      return {
        success: false,
        models: [],
        error: {
          code: 'INVALID_KEY',
          message: 'API key cannot be empty.',
          suggestedAction: 'Please enter a valid Google Gemini API key.',
        },
      };
    }

    try {
      const models = await this.fetchModels(trimmed);
      if (models.length === 0) {
        return {
          success: false,
          models: [],
          error: {
            code: 'NO_MODELS',
            message: 'No compatible text generation models found for this Gemini API key.',
            suggestedAction: 'Ensure your API key has access to the Generative Language API in Google AI Studio.',
          },
        };
      }
      return {
        success: true,
        models,
      };
    } catch (err: unknown) {
      const normalized = this.normalizeError(err);
      return {
        success: false,
        models: [],
        error: normalized,
      };
    }
  }

  async fetchModels(apiKey: string): Promise<ProviderModel[]> {
    const trimmed = apiKey.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        method: 'GET',
        headers: {
          'x-goog-api-key': trimmed,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errJson: any = null;
        try {
          errJson = await res.json();
        } catch {
          // ignore json parse error
        }
        throw { status: res.status, errorData: errJson };
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.models)) {
        return [];
      }

      // Filter real models supporting generateContent for text synthesis
      const parsed: ProviderModel[] = data.models
        .filter((m: any) => {
          const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
          const name = m.name || '';
          const cleanId = name.replace(/^models\//, '');
          
          // Exclude embedding, audio-only, specialized non-text synthesis models
          const isNonTextModel =
            cleanId.includes('embedding') ||
            cleanId.includes('aqa') ||
            cleanId.includes('imagen') ||
            cleanId.includes('veo') ||
            cleanId.includes('transcribe');

          return methods.includes('generateContent') && name.includes('gemini') && !isNonTextModel;
        })
        .map((m: any) => {
          const cleanId = m.name?.replace(/^models\//, '') || '';
          const isRec =
            cleanId === 'gemini-2.5-flash' ||
            cleanId === 'gemini-flash-latest' ||
            (cleanId.includes('flash') && !cleanId.includes('lite') && !cleanId.includes('preview'));
          const tokens = m.inputTokenLimit
            ? `${Math.round(m.inputTokenLimit / 1000)}k tokens`
            : undefined;

          return {
            id: cleanId,
            name: m.displayName || cleanId,
            description: m.description ? this.redactSecrets(m.description) : undefined,
            contextWindow: tokens,
            isRecommended: isRec,
            capabilities: {
              text: true,
              reasoning: cleanId.includes('pro') || cleanId.includes('thinking') || cleanId.includes('2.5'),
              vision: true,
            },
          };
        });

      // If at least one model exists and none was marked isRecommended, mark the first flash model or the first model
      if (parsed.length > 0 && !parsed.some((m) => m.isRecommended)) {
        const flashIdx = parsed.findIndex((m) => m.id.includes('flash'));
        if (flashIdx >= 0) {
          parsed[flashIdx].isRecommended = true;
        } else {
          parsed[0].isRecommended = true;
        }
      }

      return parsed;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  normalizeError(error: unknown, statusOverride?: number): NormalizedError {
    const err = error as any;
    const status = statusOverride || err?.status || (err?.httpStatus as number) || 0;
    const errorMsg = this.redactSecrets(err?.errorData?.error?.message || err?.message || '');
    const errorStatus = err?.errorData?.error?.status || '';

    // Check for Abort / Timeout
    if (err?.name === 'AbortError' || errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out while validating with Google Gemini.',
        details: 'The connection took longer than 10 seconds to respond.',
        httpStatus: 408,
        suggestedAction: 'Check your internet connection and try again.',
      };
    }

    // Check for Network Error
    if (err instanceof TypeError && (errorMsg.includes('fetch') || errorMsg.includes('network') || !status)) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection to Google Gemini failed.',
        details: 'The browser could not reach generativelanguage.googleapis.com. This may be caused by an offline state or an adblocker.',
        suggestedAction: 'Ensure you are connected to the internet and that browser extensions are not blocking Google API domains.',
      };
    }

    // Check for HTTP 400 / 401 / 403 Invalid Key
    if (
      status === 400 &&
      (errorMsg.includes('API key not valid') ||
        errorMsg.includes('API_KEY_INVALID') ||
        errorStatus === 'INVALID_ARGUMENT')
    ) {
      return {
        code: 'INVALID_KEY',
        message: 'The provided Gemini API key is invalid.',
        details: 'Google AI rejected the key as unrecognized or malformed.',
        httpStatus: 400,
        suggestedAction:
          'Visit Google AI Studio (aistudio.google.com/app/apikey) to generate or copy a fresh API key without leading or trailing spaces.',
      };
    }

    if (status === 401 || status === 403) {
      if (errorMsg.includes('API key') || errorStatus.includes('PERMISSION_DENIED')) {
        return {
          code: 'PERMISSION_DENIED',
          message: 'Permission denied for this Gemini API key.',
          details: errorMsg || 'The API key does not have access to Generative Language models or billing is disabled.',
          httpStatus: status,
          suggestedAction: 'Ensure the Generative Language API is enabled in your Google Cloud / AI Studio project.',
        };
      }
      return {
        code: 'INVALID_KEY',
        message: 'Authentication failed for Google Gemini.',
        details: errorMsg,
        httpStatus: status,
        suggestedAction: 'Verify your API key in Google AI Studio.',
      };
    }

    // Check for HTTP 429 Quota Exceeded / Rate Limited
    if (status === 429 || errorStatus === 'RESOURCE_EXHAUSTED' || errorMsg.includes('quota')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Google Gemini quota exceeded or rate limit reached.',
        details: errorMsg || 'You have exhausted your current free-tier or project quota.',
        httpStatus: 429,
        suggestedAction:
          'Wait 60 seconds before making another request, or check your rate limits in Google AI Studio console.',
      };
    }

    // Check for HTTP 500 / 503 Service Unavailable
    if (status >= 500) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Google Gemini service is temporarily unavailable.',
        details: `HTTP ${status}: Google servers returned an internal service error.`,
        httpStatus: status,
        suggestedAction: 'Google services are currently undergoing maintenance. Please retry in a few minutes.',
      };
    }

    return {
      code: 'UNKNOWN',
      message: 'Unexpected error validating Google Gemini API key.',
      details: errorMsg || 'An unknown response was received from the provider.',
      httpStatus: status || undefined,
      suggestedAction: 'Verify that your key is active in Google AI Studio and retry.',
    };
  }
}

export const geminiAdapter = new GeminiProviderAdapter();
