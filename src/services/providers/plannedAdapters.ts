import {
  IProviderAdapter,
  ProviderMetadata,
  ProviderModel,
  ValidationResult,
  NormalizedError,
} from './types';

export class PlannedProviderAdapter implements IProviderAdapter {
  constructor(readonly metadata: ProviderMetadata) {}

  async validateCredential(_apiKey: string): Promise<ValidationResult> {
    return {
      success: false,
      models: [],
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: `${this.metadata.name} integration is currently in development.`,
        suggestedAction: 'Please configure Google Gemini, which is active and fully supported.',
      },
    };
  }

  async fetchModels(_apiKey: string): Promise<ProviderModel[]> {
    return this.metadata.supportedModels;
  }

  normalizeError(_error: unknown): NormalizedError {
    return {
      code: 'UNKNOWN',
      message: `${this.metadata.name} adapter is not yet active.`,
      suggestedAction: 'Please configure Google Gemini for active research.',
    };
  }
}

export const openAiPlannedAdapter = new PlannedProviderAdapter({
  id: 'openai',
  name: 'OpenAI',
  tagline: 'GPT-4o, GPT-4o mini, o3-mini (In Development)',
  docsUrl: 'https://platform.openai.com/api-keys',
  keyPlaceholder: 'sk-proj-...',
  isImplemented: false,
  requiresRelay: false,
  supportedModels: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Flagship omni model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast, lightweight model' },
    { id: 'o3-mini', name: 'o3-mini', description: 'High-reasoning science model' },
  ],
  securityNote: 'Upcoming direct client proxy integration.',
});

export const anthropicPlannedAdapter = new PlannedProviderAdapter({
  id: 'anthropic',
  name: 'Anthropic',
  tagline: 'Claude 3.5 Sonnet, Claude 3.5 Haiku (In Development)',
  docsUrl: 'https://console.anthropic.com/settings/keys',
  keyPlaceholder: 'sk-ant-api03-...',
  isImplemented: false,
  requiresRelay: true,
  supportedModels: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'State of the art reasoning' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Ultra-fast intelligence' },
  ],
  securityNote: 'Requires stateless server relay due to browser origin restrictions.',
});

export const openRouterPlannedAdapter = new PlannedProviderAdapter({
  id: 'openrouter',
  name: 'OpenRouter',
  tagline: 'DeepSeek R1, Llama 3.3, Mistral Large (In Development)',
  docsUrl: 'https://openrouter.ai/keys',
  keyPlaceholder: 'sk-or-v1-...',
  isImplemented: false,
  requiresRelay: false,
  supportedModels: [
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Open-weights reasoning' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Open foundation model' },
  ],
  securityNote: 'Upcoming multi-provider aggregator integration.',
});
