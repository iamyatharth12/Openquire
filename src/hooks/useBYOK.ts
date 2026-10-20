import { useState, useEffect, useCallback } from 'react';
import { credentialVault } from '../services/storage/indexedDbVault';
import { getProviderAdapter, ProviderId, ProviderModel, NormalizedError } from '../services/providers';
import { MODEL_CHANGE_EVENT } from './useModelSelection';

export interface ProviderState {
  status: 'not_configured' | 'validating' | 'connected' | 'error';
  hasKey: boolean;
  maskedKey: string;
  availableModels: ProviderModel[];
  selectedModel: string | null;
  error: NormalizedError | null;
  lastValidatedAt: number | null;
  isLoading: boolean;
}

export function useBYOK(providerId: ProviderId) {
  const [state, setState] = useState<ProviderState>({
    status: 'not_configured',
    hasKey: false,
    maskedKey: '',
    availableModels: [],
    selectedModel: null,
    error: null,
    lastValidatedAt: null,
    isLoading: true,
  });

  const adapter = getProviderAdapter(providerId);

  // Load existing credential and preferences on mount
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const storedKey = await credentialVault.getKey(providerId);
      const meta = await credentialVault.getCredentialMeta(providerId);
      const savedModel = await credentialVault.getSelectedModel(providerId);

      if (storedKey && storedKey.trim().length > 0) {
        const masked = credentialVault.maskKey(storedKey);
        
        // If it was already validated successfully, restore models from adapter or metadata
        if (meta?.status === 'valid') {
          let models = adapter.metadata.supportedModels;
          try {
            // Attempt to retrieve fresh models using the key
            models = await adapter.fetchModels(storedKey);
            await credentialVault.saveAvailableModels(providerId, models);
          } catch {
            // Restore cached models from vault if available
            const cached = await credentialVault.getAvailableModels(providerId);
            models = cached && cached.length > 0 ? cached : adapter.metadata.supportedModels;
          }

          const defaultModel =
            savedModel ||
            models.find((m) => m.isRecommended)?.id ||
            models[0]?.id ||
            null;

          setState({
            status: 'connected',
            hasKey: true,
            maskedKey: masked,
            availableModels: models,
            selectedModel: defaultModel,
            error: null,
            lastValidatedAt: meta.lastValidatedAt || null,
            isLoading: false,
          });
          return;
        }

        // Stored but untested or previously failed
        setState({
          status: meta?.status === 'invalid' ? 'error' : 'not_configured',
          hasKey: true,
          maskedKey: masked,
          availableModels: [],
          selectedModel: savedModel || null,
          error: null,
          lastValidatedAt: meta?.lastValidatedAt || null,
          isLoading: false,
        });
        return;
      }

      // No key configured
      setState({
        status: 'not_configured',
        hasKey: false,
        maskedKey: '',
        availableModels: [],
        selectedModel: null,
        error: null,
        lastValidatedAt: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'UNKNOWN',
          message: 'Failed to access browser IndexedDB vault.',
          suggestedAction: 'Check that browser storage permissions are granted.',
        },
      }));
    }
  }, [providerId, adapter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Validate and save a new API key.
   */
  const validateAndSaveKey = async (rawKey: string): Promise<boolean> => {
    const trimmed = rawKey.trim();
    if (!trimmed) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 'INVALID_KEY',
          message: 'API key cannot be empty.',
          suggestedAction: 'Please enter a valid API key from the provider console.',
        },
      }));
      return false;
    }

    setState((prev) => ({ ...prev, status: 'validating', error: null }));

    const result = await adapter.validateCredential(trimmed);

    if (result.success) {
      // Save valid key to IndexedDB
      await credentialVault.saveKey(providerId, trimmed);
      await credentialVault.setValidationStatus(providerId, 'valid');

      const models = result.models.length > 0 ? result.models : adapter.metadata.supportedModels;
      await credentialVault.saveAvailableModels(providerId, models);
      const recommendedModel =
        models.find((m) => m.isRecommended)?.id || models[0]?.id || null;

      if (recommendedModel) {
        await credentialVault.saveSelectedModel(providerId, recommendedModel);
      }

      setState({
        status: 'connected',
        hasKey: true,
        maskedKey: credentialVault.maskKey(trimmed),
        availableModels: models,
        selectedModel: recommendedModel,
        error: null,
        lastValidatedAt: Date.now(),
        isLoading: false,
      });
      // Synchronize all model-dependent components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(MODEL_CHANGE_EVENT));
      }
      return true;
    } else {
      // Failed validation: Do NOT overwrite previously working key
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: result.error || {
          code: 'UNKNOWN',
          message: 'Validation failed with the provider.',
          suggestedAction: 'Please check the API key.',
        },
      }));
      return false;
    }
  };

  /**
   * Replace key: Validates new key first.
   * If validation fails, preserves the previous working key.
   */
  const replaceKey = async (newKey: string): Promise<boolean> => {
    return validateAndSaveKey(newKey);
  };

  /**
   * Remove key from vault completely.
   */
  const removeKey = async (): Promise<void> => {
    await credentialVault.removeKey(providerId);
    setState({
      status: 'not_configured',
      hasKey: false,
      maskedKey: '',
      availableModels: [],
      selectedModel: null,
      error: null,
      lastValidatedAt: null,
      isLoading: false,
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MODEL_CHANGE_EVENT));
    }
  };

  /**
   * Select a specific model and persist as user preference.
   */
  const selectModel = async (modelId: string): Promise<void> => {
    await credentialVault.saveSelectedModel(providerId, modelId);
    setState((prev) => ({ ...prev, selectedModel: modelId }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MODEL_CHANGE_EVENT));
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return {
    ...state,
    adapter,
    validateAndSaveKey,
    replaceKey,
    removeKey,
    selectModel,
    clearError,
    refresh,
  };
}
