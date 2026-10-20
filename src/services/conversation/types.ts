import { NormalizedSearchResult } from '../search/types';
import { CitationValidationResult } from '../synthesis/citationValidator';
import { ResearchMode } from '../../types/navigation';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  providerId?: string;
  modelId?: string;
  sources?: NormalizedSearchResult[];
  citations?: CitationValidationResult;
  isInterrupted?: boolean;
  status?: 'completed' | 'interrupted' | 'error' | 'generating';
  executionTimeMs?: number;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ResearchMode;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  providerId: string;
  messages: ConversationMessage[];
  initialQuery?: string;
  userId?: string; // Used when Supabase authentication is active
}

export interface ConversationSummary {
  id: string;
  title: string;
  mode: ResearchMode;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  citationsCount: number;
  preview: string;
}

export interface IConversationStorage {
  list(): Promise<ConversationSummary[]>;
  get(id: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
  rename(id: string, newTitle: string): Promise<void>;
  getStorageType(): 'local' | 'supabase';
}
