import { useState, useEffect, useCallback } from 'react';
import {
  conversationService,
  CONVERSATION_CHANGE_EVENT,
} from '../services/conversation/conversationService';
import {
  Conversation,
  ConversationSummary,
} from '../services/conversation/types';
import { ResearchMode } from '../types/navigation';

export interface UseConversationsReturn {
  conversations: ConversationSummary[];
  activeConversation: Conversation | null;
  activeId: string | null;
  isLoading: boolean;
  storageType: 'local' | 'supabase';
  selectConversation: (id: string) => Promise<Conversation | null>;
  createNewConversation: (query?: string, mode?: ResearchMode, modelId?: string) => Promise<Conversation>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await conversationService.list();
      setConversations(list);

      const currentActiveId = await conversationService.getActiveConversationId();
      const targetId = currentActiveId && list.some((c) => c.id === currentActiveId)
        ? currentActiveId
        : list[0]?.id || null;

      setActiveId(targetId);

      if (targetId) {
        const full = await conversationService.get(targetId);
        setActiveConversation(full);
      } else {
        setActiveConversation(null);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleSync = () => {
      refresh();
    };

    window.addEventListener(CONVERSATION_CHANGE_EVENT, handleSync);
    return () => {
      window.removeEventListener(CONVERSATION_CHANGE_EVENT, handleSync);
    };
  }, [refresh]);

  const selectConversation = async (id: string): Promise<Conversation | null> => {
    await conversationService.setActiveConversationId(id);
    setActiveId(id);
    const full = await conversationService.get(id);
    setActiveConversation(full);
    return full;
  };

  const createNewConversation = async (
    query = '',
    mode: ResearchMode = 'web',
    modelId = 'gemini-2.5-flash'
  ): Promise<Conversation> => {
    const convo = await conversationService.create(query, mode, modelId);
    await refresh();
    return convo;
  };

  const renameConversation = async (id: string, newTitle: string): Promise<void> => {
    await conversationService.rename(id, newTitle);
    await refresh();
  };

  const deleteConversation = async (id: string): Promise<void> => {
    await conversationService.delete(id);
    await refresh();
  };

  return {
    conversations,
    activeConversation,
    activeId,
    isLoading,
    storageType: conversationService.getStorageType(),
    selectConversation,
    createNewConversation,
    renameConversation,
    deleteConversation,
    refresh,
  };
}
