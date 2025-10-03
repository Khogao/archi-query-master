/**
 * Unit Tests for Vector Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  cosineSimilarity, 
  VectorChunk,
  inMemoryVectorStore 
} from './vectorUtils';

describe('Vector Utilities', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec1 = [1, 2, 3, 4, 5];
      const vec2 = [1, 2, 3, 4, 5];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should handle normalized vectors correctly', () => {
      const vec1 = [0.6, 0.8];
      const vec2 = [0.8, 0.6];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('inMemoryVectorStore', () => {
    it('should have initial demo data', () => {
      expect(inMemoryVectorStore.length).toBeGreaterThan(0);
    });

    it('should have valid chunk structure', () => {
      const chunk = inMemoryVectorStore[0];
      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('embedding');
      expect(chunk).toHaveProperty('documentId');
      expect(chunk).toHaveProperty('documentName');
      expect(chunk).toHaveProperty('folderId');
    });

    it('should have embeddings with correct dimensions', () => {
      const chunk = inMemoryVectorStore[0];
      expect(chunk.embedding).toHaveLength(384); // MiniLM dimension
    });

    it('should contain Vietnamese content', () => {
      const hasVietnamese = inMemoryVectorStore.some(chunk => 
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(chunk.text)
      );
      expect(hasVietnamese).toBe(true);
    });
  });
});
