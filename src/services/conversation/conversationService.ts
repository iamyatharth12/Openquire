import {
  Conversation,
  ConversationMessage,
  ConversationSummary,
  IConversationStorage,
} from './types';
import { ResearchMode } from '../../types/navigation';
import { getSupabaseConfig, supabaseClient } from './supabaseClient';

const DB_NAME = 'openquire_vault';
const DB_VERSION = 2; // Incremented for conversations store
const STORE_CONVERSATIONS = 'conversations';
const ACTIVE_CONVERSATION_KEY = 'openquire_active_conversation_id';

export const CONVERSATION_CHANGE_EVENT = 'openquire_conversation_changed';

class ConversationService implements IConversationStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // Memory store for non-browser/test environments
  private memoryConversations = new Map<string, Conversation>();
  private activeIdInMemory: string | null = null;
  private isInitialized = false;
  private currentUserId: string | null = null;

  constructor() {}

  setCurrentUserId(userId: string | null): void {
    const changed = this.currentUserId !== userId;
    this.currentUserId = userId;
    if (changed) {
      this.notifyChange(undefined, 'switch');
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private isBrowserSupported(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.isBrowserSupported()) {
      throw new Error('IndexedDB not supported in this runtime environment');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('credentials')) {
          db.createObjectStore('credentials', { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
          db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Ensure initial seed data exists on first access
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!this.isBrowserSupported()) return;

    try {
      const db = await this.getDB();
      // Purge any legacy synthetic demo conversations from previously initialized stores
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      store.delete('ai-jobs-impact');
      store.delete('renewable-energy-future');
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (typeof window !== 'undefined' && window.localStorage) {
        const active = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        if (active === 'ai-jobs-impact' || active === 'renewable-energy-future') {
          localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
        }
      }
    } catch (err) {
      console.warn('Initialization cleanup check failed:', err);
    }
  }

  getStorageType(): 'local' | 'supabase' {
    const config = getSupabaseConfig();
    return config.isConfigured ? 'supabase' : 'local';
  }

  private notifyChange(id?: string, action?: 'create' | 'update' | 'delete' | 'switch') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CONVERSATION_CHANGE_EVENT, { detail: { id, action } })
      );
    }
  }

  async list(): Promise<ConversationSummary[]> {
    await this.ensureInitialized();

    const filterByUser = (items: Conversation[]) => {
      if (this.currentUserId) {
        return items.filter((c) => c.userId === this.currentUserId);
      }
      return items.filter((c) => !c.userId);
    };

    if (!this.isBrowserSupported()) {
      const all = Array.from(this.memoryConversations.values());
      return filterByUser(all)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(this.toSummary);
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result as Conversation[]) || [];
        const summaries = filterByUser(items)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(this.toSummary);
        resolve(summaries);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private toSummary(c: Conversation): ConversationSummary {
    const lastAssistantMsg = [...c.messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    const preview =
      lastAssistantMsg?.content.slice(0, 120).replace(/[#*`]/g, '') ||
      c.initialQuery ||
      'No messages yet.';
    
    // Total citations count from assistant messages
    const citationsCount = c.messages.reduce((total, msg) => {
      if (msg.citations?.totalCitations) return total + msg.citations.totalCitations;
      if (msg.sources) return total + msg.sources.length;
      return total;
    }, 0);

    return {
      id: c.id,
      title: c.title,
      mode: c.mode,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
      citationsCount,
      preview,
    };
  }

  async get(id: string): Promise<Conversation | null> {
    await this.ensureInitialized();

    if (!this.isBrowserSupported()) {
      const found = this.memoryConversations.get(id);
      return found ? JSON.parse(JSON.stringify(found)) : null;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve((req.result as Conversation) || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async save(conversation: Conversation): Promise<void> {
    await this.ensureInitialized();

    // Security check: Never store API keys or auth headers
    const assignedUserId = conversation.userId || this.currentUserId || undefined;
    const sanitized: Conversation = {
      ...conversation,
      userId: assignedUserId,
      messages: conversation.messages.map((m) => {
        // Strip potential secrets from content
        const cleanContent = m.content
          .replace(/AIza[0-9A-Za-z-_]{30,}/g, '[REDACTED]')
          .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]')
          .replace(/Bearer\s+[a-zA-Z0-9_.-]{20,}/gi, 'Bearer [REDACTED]');
        return {
          ...m,
          content: cleanContent,
        };
      }),
      updatedAt: Date.now(),
    };

    // If Supabase is configured, sync to remote PostgreSQL with RLS
    if (supabaseClient.isConfigured) {
      try {
        await supabaseClient.save(sanitized);
      } catch (err) {
        console.warn('Supabase remote save failed, saved locally:', err);
      }
    }

    if (!this.isBrowserSupported()) {
      this.memoryConversations.set(sanitized.id, sanitized);
      this.notifyChange(sanitized.id, 'update');
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.put(sanitized);

      req.onsuccess = () => {
        this.notifyChange(sanitized.id, 'update');
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async create(
    initialQuery: string,
    mode: ResearchMode = 'web',
    modelId = 'gemini-2.5-flash',
    providerId = 'gemini'
  ): Promise<Conversation> {
    const trimmed = initialQuery.trim();
    const id = `convo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const title = trimmed ? (trimmed.length > 55 ? `${trimmed.substring(0, 52)}...` : trimmed) : 'New Research';

    const newConvo: Conversation = {
      id,
      title,
      mode,
      userId: this.currentUserId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId,
      providerId,
      initialQuery: trimmed,
      messages: trimmed
        ? [
            {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content: trimmed,
              timestamp: Date.now(),
            },
          ]
        : [],
    };

    await this.save(newConvo);
    await this.setActiveConversationId(id);
    this.notifyChange(id, 'create');
    return newConvo;
  }

  async rename(id: string, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error('Conversation title cannot be empty.');

    const convo = await this.get(id);
    if (!convo) throw new Error(`Conversation not found: ${id}`);

    convo.title = trimmed;
    await this.save(convo);
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();

    if (supabaseClient.isConfigured) {
      try {
        await supabaseClient.delete(id);
      } catch (err) {
        console.warn('Supabase remote delete failed:', err);
      }
    }

    if (!this.isBrowserSupported()) {
      this.memoryConversations.delete(id);
      if (this.activeIdInMemory === id) {
        const remaining = Array.from(this.memoryConversations.keys());
        this.activeIdInMemory = remaining[0] || null;
      }
      this.notifyChange(id, 'delete');
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.delete(id);

      req.onsuccess = async () => {
        const active = await this.getActiveConversationId();
        if (active === id) {
          const list = await this.list();
          const nextActive = list[0]?.id || null;
          if (nextActive) {
            await this.setActiveConversationId(nextActive);
          } else {
            localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
          }
        }
        this.notifyChange(id, 'delete');
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async addMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    const convo = await this.get(conversationId);
    if (!convo) {
      throw new Error(`Cannot add message: conversation ${conversationId} does not exist.`);
    }

    // Avoid duplicate messages with same id
    const existingIndex = convo.messages.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      convo.messages[existingIndex] = message;
    } else {
      convo.messages.push(message);
    }

    await this.save(convo);
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<ConversationMessage>
  ): Promise<void> {
    const convo = await this.get(conversationId);
    if (!convo) return;

    const msgIdx = convo.messages.findIndex((m) => m.id === messageId);
    if (msgIdx >= 0) {
      convo.messages[msgIdx] = {
        ...convo.messages[msgIdx],
        ...updates,
      };
      await this.save(convo);
    }
  }

  async getActiveConversationId(): Promise<string | null> {
    if (!this.isBrowserSupported()) {
      return this.activeIdInMemory;
    }
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY) || null;
  }

  async setActiveConversationId(id: string): Promise<void> {
    if (!this.isBrowserSupported()) {
      this.activeIdInMemory = id;
      return;
    }
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    this.notifyChange(id, 'switch');
  }
}

export const conversationService = new ConversationService();
