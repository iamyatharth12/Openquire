/**
 * Storage contracts and types for Openquire Bring-Your-Own-Key (BYOK) system.
 * Keys are strictly stored browser-side in IndexedDB and never persisted in
 * central databases, application logs, or telemetry.
 */

export interface StoredCredential {
  providerId: string;
  encryptedKey: string; // The credential value
  createdAt: number;
  updatedAt: number;
  lastValidatedAt?: number;
  status: 'valid' | 'invalid' | 'untested';
}

export interface ProviderPreference {
  providerId: string;
  selectedModelId?: string;
  availableModels?: any[];
  updatedAt: number;
}

export interface ICredentialStorage {
  /**
   * Save or update an API key for a given provider.
   */
  saveKey(providerId: string, apiKey: string): Promise<void>;

  /**
   * Retrieve the active API key for a given provider.
   */
  getKey(providerId: string): Promise<string | null>;

  /**
   * Check if a key exists for a provider without returning the full plaintext.
   */
  hasKey(providerId: string): Promise<boolean>;

  /**
   * Delete an API key for a given provider.
   */
  removeKey(providerId: string): Promise<void>;

  /**
   * List all provider IDs with stored credentials.
   */
  listConfiguredProviders(): Promise<string[]>;

  /**
   * Get metadata record for a provider (timestamps, status).
   */
  getCredentialMeta(providerId: string): Promise<Omit<StoredCredential, 'encryptedKey'> | null>;

  /**
   * Update validation status for a provider key.
   */
  setValidationStatus(providerId: string, status: 'valid' | 'invalid'): Promise<void>;

  /**
   * Save a non-secret user preference (e.g. selected model).
   */
  saveSelectedModel(providerId: string, modelId: string): Promise<void>;

  /**
   * Retrieve the selected model preference for a provider.
   */
  getSelectedModel(providerId: string): Promise<string | null>;

  /**
   * Save discovered models for a provider.
   */
  saveAvailableModels(providerId: string, models: any[]): Promise<void>;

  /**
   * Retrieve cached discovered models for a provider.
   */
  getAvailableModels(providerId: string): Promise<any[] | null>;

  /**
   * Mask an API key for safe UI display (e.g. "AIzaSy...7kL9").
   */
  maskKey(key: string): string;
}
