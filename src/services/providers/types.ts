export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export type ProviderStatus = 'not_configured' | 'validating' | 'connected' | 'error';

export type NormalizedErrorCode =
  | 'INVALID_KEY'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'UNSUPPORTED_MODEL'
  | 'NO_MODELS'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface NormalizedError {
  code: NormalizedErrorCode;
  message: string;
  details?: string;
  httpStatus?: number;
  suggestedAction: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: string;
  isRecommended?: boolean;
  capabilities?: {
    text: boolean;
    reasoning?: boolean;
    vision?: boolean;
  };
}

export interface ProviderMetadata {
  id: ProviderId;
  name: string;
  tagline: string;
  docsUrl: string;
  keyPlaceholder: string;
  supportedModels: ProviderModel[];
  isImplemented: boolean;
  requiresRelay: boolean;
  securityNote?: string;
}

export interface ValidationResult {
  success: boolean;
  models: ProviderModel[];
  error?: NormalizedError;
}

export interface IProviderAdapter {
  readonly metadata: ProviderMetadata;

  /**
   * Validate user API key against real provider endpoints.
   * Never leaks or logs key material.
   */
  validateCredential(apiKey: string): Promise<ValidationResult>;

  /**
   * Discover or fetch list of supported models for this credential.
   */
  fetchModels(apiKey: string): Promise<ProviderModel[]>;

  /**
   * Normalize raw errors into human-actionable, safe structures.
   */
  normalizeError(error: unknown, status?: number): NormalizedError;
}
