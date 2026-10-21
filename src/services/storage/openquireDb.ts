/**
 * Unified IndexedDB Storage Manager for Openquire Vault
 *
 * Provides a shared, single-source-of-truth database connection pool across:
 * - Credentials store ('credentials')
 * - Preferences store ('preferences')
 * - Conversations store ('conversations')
 *
 * Prevents VersionError collisions and blocking between different components.
 */

export const OPENQUIRE_DB_NAME = 'openquire_vault';
export const OPENQUIRE_DB_VERSION = 2;

export const STORE_CREDENTIALS = 'credentials';
export const STORE_PREFERENCES = 'preferences';
export const STORE_CONVERSATIONS = 'conversations';

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/**
 * Retrieves the shared open IDBDatabase instance, upgrading schema if necessary.
 */
export async function getOpenquireVaultDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new Error('IndexedDB is not supported in this runtime environment');
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(OPENQUIRE_DB_NAME, OPENQUIRE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CREDENTIALS)) {
          db.createObjectStore(STORE_CREDENTIALS, { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
          db.createObjectStore(STORE_PREFERENCES, { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
          db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        // Gracefully close on versionchange to avoid blocking concurrent upgrades
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        db.onclose = () => {
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB openquire_vault'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB open blocked: please close other Openquire tabs.');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Resets cached DB connection (used primarily in test suites or on clean reset)
 */
export function resetDBConnection(): void {
  dbPromise = null;
}
