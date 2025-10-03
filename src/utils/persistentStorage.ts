/**
 * Persistent Storage using IndexedDB (Dexie.js)
 * Stores documents, chunks, embeddings, and folders
 */

import Dexie, { Table } from 'dexie';
import { VectorChunk } from './vectorUtils';
import { DocumentItem, Folder } from '@/hooks/useDocuments';

export interface StoredDocument extends DocumentItem {
  content?: string; // Full text content
  chunks?: string[]; // IDs of associated chunks
  processingMethod?: 'text' | 'ocr';
  metadata?: Record<string, any>;
}

export interface StoredChunk extends VectorChunk {
  createdAt: number;
  updatedAt: number;
}

export interface StoredFolder extends Folder {
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: string;
  selectedModel?: string;
  selectedEmbeddingModel?: string;
  selectedPlatform?: string;
  ocrConfig?: Record<string, any>;
  lastSync?: number;
}

/**
 * Dexie Database Class
 */
class ArchiQueryDatabase extends Dexie {
  documents!: Table<StoredDocument, string>;
  chunks!: Table<StoredChunk, string>;
  folders!: Table<StoredFolder, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ArchiQueryDB');
    
    this.version(1).stores({
      documents: 'id, name, folderId, dateAdded, type',
      chunks: 'id, documentId, folderId, documentName',
      folders: 'id, name, parentId',
      settings: 'id'
    });
  }
}

// Create database instance
export const db = new ArchiQueryDatabase();

/**
 * Document Operations
 */
export const DocumentStorage = {
  // Add or update document
  async save(document: StoredDocument): Promise<string> {
    await db.documents.put(document);
    return document.id;
  },

  // Get document by ID
  async get(id: string): Promise<StoredDocument | undefined> {
    return await db.documents.get(id);
  },

  // Get all documents
  async getAll(): Promise<StoredDocument[]> {
    return await db.documents.toArray();
  },

  // Get documents by folder
  async getByFolder(folderId: string): Promise<StoredDocument[]> {
    return await db.documents.where('folderId').equals(folderId).toArray();
  },

  // Delete document
  async delete(id: string): Promise<void> {
    const doc = await db.documents.get(id);
    if (doc?.chunks) {
      // Delete associated chunks
      await db.chunks.bulkDelete(doc.chunks);
    }
    await db.documents.delete(id);
  },

  // Search documents by name
  async search(query: string): Promise<StoredDocument[]> {
    const lowerQuery = query.toLowerCase();
    return await db.documents
      .filter(doc => doc.name.toLowerCase().includes(lowerQuery))
      .toArray();
  },

  // Get document count
  async count(): Promise<number> {
    return await db.documents.count();
  }
};

/**
 * Chunk Operations (Vector Store)
 */
export const ChunkStorage = {
  // Add or update chunk
  async save(chunk: Omit<StoredChunk, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const storedChunk: StoredChunk = {
      ...chunk,
      createdAt: now,
      updatedAt: now
    };
    await db.chunks.put(storedChunk);
    return chunk.id;
  },

  // Bulk save chunks (more efficient)
  async saveBulk(chunks: Omit<StoredChunk, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const now = Date.now();
    const storedChunks: StoredChunk[] = chunks.map(chunk => ({
      ...chunk,
      createdAt: now,
      updatedAt: now
    }));
    await db.chunks.bulkPut(storedChunks);
  },

  // Get chunk by ID
  async get(id: string): Promise<StoredChunk | undefined> {
    return await db.chunks.get(id);
  },

  // Get all chunks
  async getAll(): Promise<StoredChunk[]> {
    return await db.chunks.toArray();
  },

  // Get chunks by document
  async getByDocument(documentId: string): Promise<StoredChunk[]> {
    return await db.chunks.where('documentId').equals(documentId).toArray();
  },

  // Get chunks by folder(s)
  async getByFolders(folderIds: string[]): Promise<StoredChunk[]> {
    return await db.chunks.where('folderId').anyOf(folderIds).toArray();
  },

  // Delete chunk
  async delete(id: string): Promise<void> {
    await db.chunks.delete(id);
  },

  // Delete chunks by document
  async deleteByDocument(documentId: string): Promise<void> {
    const chunks = await db.chunks.where('documentId').equals(documentId).toArray();
    await db.chunks.bulkDelete(chunks.map(c => c.id));
  },

  // Get chunk count
  async count(): Promise<number> {
    return await db.chunks.count();
  },

  // Clear all chunks (use with caution)
  async clear(): Promise<void> {
    await db.chunks.clear();
  }
};

/**
 * Folder Operations
 */
export const FolderStorage = {
  // Add or update folder
  async save(folder: Omit<StoredFolder, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const storedFolder: StoredFolder = {
      ...folder,
      createdAt: now,
      updatedAt: now
    };
    await db.folders.put(storedFolder);
    return folder.id;
  },

  // Bulk save folders
  async saveBulk(folders: Omit<StoredFolder, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const now = Date.now();
    const storedFolders: StoredFolder[] = folders.map(folder => ({
      ...folder,
      createdAt: now,
      updatedAt: now
    }));
    await db.folders.bulkPut(storedFolders);
  },

  // Get folder by ID
  async get(id: string): Promise<StoredFolder | undefined> {
    return await db.folders.get(id);
  },

  // Get all folders
  async getAll(): Promise<StoredFolder[]> {
    return await db.folders.toArray();
  },

  // Get root folders (no parent)
  async getRootFolders(): Promise<StoredFolder[]> {
    return await db.folders.where('parentId').equals('').or('parentId').equals(undefined).toArray();
  },

  // Get subfolders
  async getSubfolders(parentId: string): Promise<StoredFolder[]> {
    return await db.folders.where('parentId').equals(parentId).toArray();
  },

  // Delete folder
  async delete(id: string): Promise<void> {
    // Delete all documents in folder
    const docs = await db.documents.where('folderId').equals(id).toArray();
    for (const doc of docs) {
      await DocumentStorage.delete(doc.id);
    }
    
    // Delete all subfolders recursively
    const subfolders = await db.folders.where('parentId').equals(id).toArray();
    for (const subfolder of subfolders) {
      await FolderStorage.delete(subfolder.id);
    }
    
    await db.folders.delete(id);
  },

  // Get folder count
  async count(): Promise<number> {
    return await db.folders.count();
  }
};

/**
 * Settings Operations
 */
export const SettingsStorage = {
  // Save settings
  async save(settings: AppSettings): Promise<void> {
    await db.settings.put(settings);
  },

  // Get settings
  async get(id: string = 'app'): Promise<AppSettings | undefined> {
    return await db.settings.get(id);
  },

  // Update specific setting
  async update(id: string, updates: Partial<AppSettings>): Promise<void> {
    const existing = await db.settings.get(id);
    if (existing) {
      await db.settings.put({ ...existing, ...updates });
    } else {
      await db.settings.put({ id, ...updates });
    }
  }
};

/**
 * Database Utilities
 */
export const DatabaseUtils = {
  // Get database size estimate
  async getSize(): Promise<{ documents: number; chunks: number; folders: number }> {
    return {
      documents: await db.documents.count(),
      chunks: await db.chunks.count(),
      folders: await db.folders.count()
    };
  },

  // Clear all data (use with caution)
  async clearAll(): Promise<void> {
    await db.documents.clear();
    await db.chunks.clear();
    await db.folders.clear();
    await db.settings.clear();
  },

  // Export data to JSON
  async exportData(): Promise<string> {
    const data = {
      documents: await db.documents.toArray(),
      chunks: await db.chunks.toArray(),
      folders: await db.folders.toArray(),
      settings: await db.settings.toArray(),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  // Import data from JSON
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.folders) await db.folders.bulkPut(data.folders);
      if (data.documents) await db.documents.bulkPut(data.documents);
      if (data.chunks) await db.chunks.bulkPut(data.chunks);
      if (data.settings) await db.settings.bulkPut(data.settings);
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Check if database is empty
  async isEmpty(): Promise<boolean> {
    const docCount = await db.documents.count();
    return docCount === 0;
  }
};

/**
 * Initialize database with default data if empty
 */
export async function initializeDatabase(): Promise<void> {
  const isEmpty = await DatabaseUtils.isEmpty();
  
  if (isEmpty) {
    console.log('Initializing database with default data...');
    
    // Create default folders
    const defaultFolders: Omit<StoredFolder, 'createdAt' | 'updatedAt'>[] = [
      { id: 'standards', name: 'Tiêu chuẩn & Quy Chuẩn', children: ['standards-construction', 'standards-architecture', 'standards-fireprotection'], isSelected: false },
      { id: 'legal-investment', name: 'Pháp lý Đầu tư & dự án', isSelected: false },
      { id: 'legal-land', name: 'Pháp lý Đất đai', isSelected: false },
      { id: 'local-regulations', name: 'Quy định của Địa phương', children: ['local-hcmc', 'local-hanoi', 'local-danang'], isSelected: false },
      { id: 'standards-construction', name: 'Xây dựng', parentId: 'standards', isSelected: false },
      { id: 'standards-architecture', name: 'Kiến trúc', parentId: 'standards', isSelected: false },
      { id: 'standards-fireprotection', name: 'PCCC', parentId: 'standards', isSelected: false },
      { id: 'local-hcmc', name: 'TP. Hồ Chí Minh', parentId: 'local-regulations', isSelected: false },
      { id: 'local-hanoi', name: 'Hà Nội', parentId: 'local-regulations', isSelected: false },
      { id: 'local-danang', name: 'Đà Nẵng', parentId: 'local-regulations', isSelected: false },
    ];
    
    await FolderStorage.saveBulk(defaultFolders);
    
    // Create default settings
    await SettingsStorage.save({
      id: 'app',
      selectedModel: 'llama3:8b',
      selectedEmbeddingModel: 'Xenova/all-MiniLM-L6-v2',
      selectedPlatform: 'ollama',
      lastSync: Date.now()
    });
    
    console.log('Database initialized successfully');
  }
}
