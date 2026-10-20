export interface StoredDocument {
  id: string;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  type: string;
  createdAt: number;
  snippet?: string;
  content?: string;
}

const STORAGE_KEY = 'openquire_user_documents';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export class DocumentStorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async list(): Promise<StoredDocument[]> {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Failed to read documents from storage:', err);
      return [];
    }
  }

  async save(doc: Omit<StoredDocument, 'id' | 'createdAt' | 'formattedSize'>): Promise<StoredDocument> {
    const list = await this.list();
    const newDoc: StoredDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      formattedSize: formatBytes(doc.sizeBytes),
    };
    list.unshift(newDoc);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return newDoc;
  }

  async delete(id: string): Promise<void> {
    const list = await this.list();
    const filtered = list.filter((d) => d.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  async getTotalSizeBytes(): Promise<number> {
    const list = await this.list();
    return list.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  }

  formatSize(bytes: number): string {
    return formatBytes(bytes);
  }
}

export const documentStorage = new DocumentStorageService();
