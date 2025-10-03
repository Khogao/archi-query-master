/**
 * Unit Tests for Persistent Storage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  db,
  DocumentStorage,
  ChunkStorage,
  FolderStorage,
  SettingsStorage,
  DatabaseUtils,
  initializeDatabase
} from './persistentStorage';
import type { StoredDocument, StoredChunk, StoredFolder } from './persistentStorage';

describe('Persistent Storage', () => {
  beforeEach(async () => {
    // Clear database before each test
    await DatabaseUtils.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await DatabaseUtils.clearAll();
  });

  describe('DocumentStorage', () => {
    it('should save and retrieve a document', async () => {
      const doc: StoredDocument = {
        id: 'test-doc-1',
        name: 'Test Document',
        type: 'pdf',
        size: '1 MB',
        dateAdded: '2025-10-03',
        folderId: 'test-folder',
        content: 'Test content'
      };

      await DocumentStorage.save(doc);
      const retrieved = await DocumentStorage.get('test-doc-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Document');
      expect(retrieved?.content).toBe('Test content');
    });

    it('should get documents by folder', async () => {
      const docs: StoredDocument[] = [
        {
          id: 'doc-1',
          name: 'Doc 1',
          type: 'pdf',
          size: '1 MB',
          dateAdded: '2025-10-03',
          folderId: 'folder-a'
        },
        {
          id: 'doc-2',
          name: 'Doc 2',
          type: 'pdf',
          size: '2 MB',
          dateAdded: '2025-10-03',
          folderId: 'folder-b'
        }
      ];

      for (const doc of docs) {
        await DocumentStorage.save(doc);
      }

      const folderADocs = await DocumentStorage.getByFolder('folder-a');
      expect(folderADocs).toHaveLength(1);
      expect(folderADocs[0].name).toBe('Doc 1');
    });

    it('should search documents by name', async () => {
      const docs: StoredDocument[] = [
        {
          id: 'doc-1',
          name: 'Quy chuẩn xây dựng',
          type: 'pdf',
          size: '1 MB',
          dateAdded: '2025-10-03',
          folderId: 'folder-a'
        },
        {
          id: 'doc-2',
          name: 'Luật đất đai',
          type: 'pdf',
          size: '2 MB',
          dateAdded: '2025-10-03',
          folderId: 'folder-b'
        }
      ];

      for (const doc of docs) {
        await DocumentStorage.save(doc);
      }

      const results = await DocumentStorage.search('quy chuẩn');
      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('Quy chuẩn');
    });

    it('should delete a document', async () => {
      const doc: StoredDocument = {
        id: 'doc-to-delete',
        name: 'To Delete',
        type: 'pdf',
        size: '1 MB',
        dateAdded: '2025-10-03',
        folderId: 'test-folder'
      };

      await DocumentStorage.save(doc);
      await DocumentStorage.delete('doc-to-delete');
      
      const retrieved = await DocumentStorage.get('doc-to-delete');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('ChunkStorage', () => {
    it('should save and retrieve chunks', async () => {
      const chunk: Omit<StoredChunk, 'createdAt' | 'updatedAt'> = {
        id: 'chunk-1',
        text: 'Test chunk text',
        embedding: Array(384).fill(0.5),
        documentId: 'doc-1',
        documentName: 'Test Doc',
        folderId: 'folder-1'
      };

      await ChunkStorage.save(chunk);
      const retrieved = await ChunkStorage.get('chunk-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.text).toBe('Test chunk text');
      expect(retrieved?.embedding).toHaveLength(384);
    });

    it('should bulk save chunks', async () => {
      const chunks: Omit<StoredChunk, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'chunk-1',
          text: 'Chunk 1',
          embedding: Array(384).fill(0.1),
          documentId: 'doc-1',
          documentName: 'Doc 1',
          folderId: 'folder-1'
        },
        {
          id: 'chunk-2',
          text: 'Chunk 2',
          embedding: Array(384).fill(0.2),
          documentId: 'doc-1',
          documentName: 'Doc 1',
          folderId: 'folder-1'
        }
      ];

      await ChunkStorage.saveBulk(chunks);
      const count = await ChunkStorage.count();
      
      expect(count).toBe(2);
    });

    it('should get chunks by document', async () => {
      const chunks: Omit<StoredChunk, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'chunk-1',
          text: 'Chunk 1',
          embedding: Array(384).fill(0.1),
          documentId: 'doc-1',
          documentName: 'Doc 1',
          folderId: 'folder-1'
        },
        {
          id: 'chunk-2',
          text: 'Chunk 2',
          embedding: Array(384).fill(0.2),
          documentId: 'doc-2',
          documentName: 'Doc 2',
          folderId: 'folder-1'
        }
      ];

      await ChunkStorage.saveBulk(chunks);
      const doc1Chunks = await ChunkStorage.getByDocument('doc-1');
      
      expect(doc1Chunks).toHaveLength(1);
      expect(doc1Chunks[0].text).toBe('Chunk 1');
    });
  });

  describe('FolderStorage', () => {
    it('should save and retrieve folders', async () => {
      const folder: Omit<StoredFolder, 'createdAt' | 'updatedAt'> = {
        id: 'folder-1',
        name: 'Test Folder',
        isSelected: false
      };

      await FolderStorage.save(folder);
      const retrieved = await FolderStorage.get('folder-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Folder');
    });

    it('should handle folder hierarchy', async () => {
      const folders: Omit<StoredFolder, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'parent',
          name: 'Parent Folder',
          children: ['child-1', 'child-2'],
          isSelected: false
        },
        {
          id: 'child-1',
          name: 'Child 1',
          parentId: 'parent',
          isSelected: false
        },
        {
          id: 'child-2',
          name: 'Child 2',
          parentId: 'parent',
          isSelected: false
        }
      ];

      await FolderStorage.saveBulk(folders);
      const subfolders = await FolderStorage.getSubfolders('parent');
      
      expect(subfolders).toHaveLength(2);
    });
  });

  describe('DatabaseUtils', () => {
    it('should check if database is empty', async () => {
      const isEmpty = await DatabaseUtils.isEmpty();
      expect(isEmpty).toBe(true);
    });

    it('should get database size', async () => {
      await DocumentStorage.save({
        id: 'doc-1',
        name: 'Test',
        type: 'pdf',
        size: '1 MB',
        dateAdded: '2025-10-03',
        folderId: 'folder-1'
      });

      const size = await DatabaseUtils.getSize();
      expect(size.documents).toBe(1);
    });

    it('should export and import data', async () => {
      // Add some test data
      await DocumentStorage.save({
        id: 'doc-1',
        name: 'Export Test',
        type: 'pdf',
        size: '1 MB',
        dateAdded: '2025-10-03',
        folderId: 'folder-1'
      });

      // Export
      const exported = await DatabaseUtils.exportData();
      expect(exported).toBeTruthy();
      
      // Clear and import
      await DatabaseUtils.clearAll();
      await DatabaseUtils.importData(exported);
      
      // Verify
      const doc = await DocumentStorage.get('doc-1');
      expect(doc).toBeDefined();
      expect(doc?.name).toBe('Export Test');
    });
  });

  describe('initializeDatabase', () => {
    it('should initialize database with default data when empty', async () => {
      await initializeDatabase();
      
      const folders = await FolderStorage.getAll();
      const settings = await SettingsStorage.get('app');
      
      expect(folders.length).toBeGreaterThan(0);
      expect(settings).toBeDefined();
    });

    it('should not reinitialize if data exists', async () => {
      await initializeDatabase();
      const initialCount = await FolderStorage.count();
      
      await initializeDatabase();
      const afterCount = await FolderStorage.count();
      
      expect(afterCount).toBe(initialCount);
    });
  });
});
