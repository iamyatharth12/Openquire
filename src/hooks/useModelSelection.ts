import { useState, useEffect, useCallback } from 'react';
import { credentialVault } from '../services/storage/indexedDbVault';
import { geminiAdapter } from '../services/providers/geminiAdapter';
import { ProviderModel } from '../services/providers/types';

export interface ModelSelectionState {
  isConfigured: boolean;
  activeProvider: string | null;
  selectedModel: string;
  availableModels: ProviderModel[];
  isLoading: boolean;
  selectModel: (modelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Global event bus for cross-component model sync
export const MODEL_CHANGE_EVENT = 'openquire_model_changed';

export function useModelSelection(): ModelSelectionState {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const geminiKey = await credentialVault.getKey('gemini');
      const hasKey = Boolean(geminiKey && geminiKey.trim().length > 0);

      if (hasKey && geminiKey) {
        setIsConfigured(true);
        setActiveProvider('gemini');

        // Retrieve real models discovered from Gemini API, falling back to cached or verified models
        let models: ProviderModel[] = [];
        try {
          models = await geminiAdapter.fetchModels(geminiKey);
          await credentialVault.saveAvailableModels('gemini', models);
        } catch {
          const cached = await credentialVault.getAvailableModels('gemini');
          models = cached && cached.length > 0 ? cached : geminiAdapter.metadata.supportedModels;
        }

        setAvailableModels(models);

        // Retrieve user's explicitly selected model
        const saved = await credentialVault.getSelectedModel('gemini');
        if (saved && models.some((m) => m.id === saved)) {
          setSelectedModel(saved);
        } else {
          const defaultModel =
            models.find((m) => m.isRecommended)?.id || models[0]?.id || '';
          setSelectedModel(defaultModel);
          if (defaultModel) {
            await credentialVault.saveSelectedModel('gemini', defaultModel);
          }
        }
      } else {
        setIsConfigured(false);
        setActiveProvider(null);
        setAvailableModels([]);
        setSelectedModel('');
      }
    } catch (err) {
      console.error('Failed to load model preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();

    const handleSync = () => {
      loadModels();
    };

    window.addEventListener(MODEL_CHANGE_EVENT, handleSync);
    return () => {
      window.removeEventListener(MODEL_CHANGE_EVENT, handleSync);
    };
  }, [loadModels]);

  const selectModel = async (modelId: string) => {
    if (!modelId) return;
    setSelectedModel(modelId);
    if (activeProvider) {
      await credentialVault.saveSelectedModel(activeProvider, modelId);
    }
    // Broadcast model change to all listening components
    window.dispatchEvent(new CustomEvent(MODEL_CHANGE_EVENT));
  };

  return {
    isConfigured,
    activeProvider,
    selectedModel,
    availableModels,
    isLoading,
    selectModel,
    refresh: loadModels,
  };
}
