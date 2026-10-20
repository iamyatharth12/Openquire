import { ICredentialStorage, StoredCredential, ProviderPreference } from './types';

const DB_NAME = 'openquire_vault';
const DB_VERSION = 1;
const STORE_CREDENTIALS = 'credentials';
const STORE_PREFERENCES = 'preferences';

class IndexedDbVault implements ICredentialStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // In-memory fallback for non-browser/test environments
  private memoryCredentials = new Map<string, StoredCredential>();
  private memoryPreferences = new Map<string, ProviderPreference>();

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
        if (!db.objectStoreNames.contains(STORE_CREDENTIALS)) {
          db.createObjectStore(STORE_CREDENTIALS, { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
          db.createObjectStore(STORE_PREFERENCES, { keyPath: 'providerId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB vault'));
      };
    });

    return this.dbPromise;
  }

  async saveKey(providerId: string, apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }

    const now = Date.now();

    if (!this.isBrowserSupported()) {
      const existing = this.memoryCredentials.get(providerId);
      this.memoryCredentials.set(providerId, {
        providerId,
        encryptedKey: trimmed,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        status: 'untested',
      });
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
      const store = tx.objectStore(STORE_CREDENTIALS);

      const getReq = store.get(providerId);
      getReq.onsuccess = () => {
        const existing = getReq.result as StoredCredential | undefined;
        const record: StoredCredential = {
          providerId,
          encryptedKey: trimmed,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          status: 'untested',
        };

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async getKey(providerId: string): Promise<string | null> {
    if (!this.isBrowserSupported()) {
      const record = this.memoryCredentials.get(providerId);
      return record ? record.encryptedKey : null;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.get(providerId);
      req.onsuccess = () => {
        const record = req.result as StoredCredential | undefined;
        resolve(record ? record.encryptedKey : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async hasKey(providerId: string): Promise<boolean> {
    const key = await this.getKey(providerId);
    return key !== null && key.length > 0;
  }

  async removeKey(providerId: string): Promise<void> {
    if (!this.isBrowserSupported()) {
      this.memoryCredentials.delete(providerId);
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.delete(providerId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async listConfiguredProviders(): Promise<string[]> {
    if (!this.isBrowserSupported()) {
      return Array.from(this.memoryCredentials.keys());
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        resolve((req.result as string[]) || []);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCredentialMeta(providerId: string): Promise<Omit<StoredCredential, 'encryptedKey'> | null> {
    if (!this.isBrowserSupported()) {
      const record = this.memoryCredentials.get(providerId);
      if (!record) return null;
      const { encryptedKey: _, ...meta } = record;
      return meta;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.get(providerId);
      req.onsuccess = () => {
        const record = req.result as StoredCredential | undefined;
        if (!record) {
          resolve(null);
          return;
        }
        const { encryptedKey: _, ...meta } = record;
        resolve(meta);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async setValidationStatus(providerId: string, status: 'valid' | 'invalid'): Promise<void> {
    const now = Date.now();
    if (!this.isBrowserSupported()) {
      const record = this.memoryCredentials.get(providerId);
      if (record) {
        record.status = status;
        record.lastValidatedAt = now;
      }
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.get(providerId);
      req.onsuccess = () => {
        const record = req.result as StoredCredential | undefined;
        if (record) {
          record.status = status;
          record.lastValidatedAt = now;
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveSelectedModel(providerId: string, modelId: string): Promise<void> {
    const now = Date.now();
    if (!this.isBrowserSupported()) {
      this.memoryPreferences.set(providerId, {
        providerId,
        selectedModelId: modelId,
        updatedAt: now,
      });
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREFERENCES, 'readwrite');
      const store = tx.objectStore(STORE_PREFERENCES);
      const record: ProviderPreference = {
        providerId,
        selectedModelId: modelId,
        updatedAt: now,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSelectedModel(providerId: string): Promise<string | null> {
    if (!this.isBrowserSupported()) {
      const record = this.memoryPreferences.get(providerId);
      return record?.selectedModelId || null;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREFERENCES, 'readonly');
      const store = tx.objectStore(STORE_PREFERENCES);
      const req = store.get(providerId);
      req.onsuccess = () => {
        const record = req.result as ProviderPreference | undefined;
        resolve(record?.selectedModelId || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveAvailableModels(providerId: string, models: any[]): Promise<void> {
    const now = Date.now();
    if (!this.isBrowserSupported()) {
      const existing = this.memoryPreferences.get(providerId);
      this.memoryPreferences.set(providerId, {
        providerId,
        selectedModelId: existing?.selectedModelId,
        availableModels: models,
        updatedAt: now,
      });
      return;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREFERENCES, 'readwrite');
      const store = tx.objectStore(STORE_PREFERENCES);
      const getReq = store.get(providerId);
      getReq.onsuccess = () => {
        const existing = getReq.result as ProviderPreference | undefined;
        const record: ProviderPreference = {
          providerId,
          selectedModelId: existing?.selectedModelId,
          availableModels: models,
          updatedAt: now,
        };
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async getAvailableModels(providerId: string): Promise<any[] | null> {
    if (!this.isBrowserSupported()) {
      const record = this.memoryPreferences.get(providerId);
      return record?.availableModels || null;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREFERENCES, 'readonly');
      const store = tx.objectStore(STORE_PREFERENCES);
      const req = store.get(providerId);
      req.onsuccess = () => {
        const record = req.result as ProviderPreference | undefined;
        resolve(record?.availableModels || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 10) {
      return '••••••••••';
    }
    const prefix = key.slice(0, 6);
    const suffix = key.slice(-4);
    return `${prefix}${'•'.repeat(Math.min(key.length - 10, 24))}${suffix}`;
  }
}

export const credentialVault = new IndexedDbVault();
