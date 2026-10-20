import { ProviderId, IProviderAdapter } from './types';
import { geminiAdapter } from './geminiAdapter';
import {
  openAiPlannedAdapter,
  anthropicPlannedAdapter,
  openRouterPlannedAdapter,
} from './plannedAdapters';

export * from './types';
export { geminiAdapter } from './geminiAdapter';

const adapters: Record<ProviderId, IProviderAdapter> = {
  gemini: geminiAdapter,
  openai: openAiPlannedAdapter,
  anthropic: anthropicPlannedAdapter,
  openrouter: openRouterPlannedAdapter,
};

export function getProviderAdapter(id: ProviderId): IProviderAdapter {
  const adapter = adapters[id];
  if (!adapter) {
    throw new Error(`Unrecognized provider ID: ${id}`);
  }
  return adapter;
}

export function getAllProviders(): IProviderAdapter[] {
  return [geminiAdapter, openAiPlannedAdapter, anthropicPlannedAdapter, openRouterPlannedAdapter];
}
