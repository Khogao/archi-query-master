/**
 * RAG Query Engine
 * Orchestrates the complete RAG workflow:
 * 1. Embed query
 * 2. Search vector database
 * 3. Retrieve relevant chunks
 * 4. Build context
 * 5. Generate response with AI
 */

import { BaseAIProvider } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';
import type {
  RAGQuery,
  RAGResponse,
  RetrievedChunk,
  AIProvider,
  StreamCallback,
} from './types';
import { generateEmbedding } from '../../utils/vectorUtils';
import { ChunkStorage } from '../../utils/persistentStorage';
import { embeddingCache, perfMonitor } from '../../utils/performance';

export class RAGEngine {
  private providers: Map<AIProvider, BaseAIProvider>;
  private currentProvider: AIProvider;

  constructor(initialProvider: AIProvider = 'gemini') {
    this.providers = new Map();
    this.currentProvider = initialProvider;
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider: BaseAIProvider): void {
    this.providers.set(provider.getProvider(), provider);
  }

  /**
   * Set active provider
   */
  setProvider(provider: AIProvider): void {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} not registered`);
    }
    this.currentProvider = provider;
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Main RAG query method - complete workflow
   */
  async query(params: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();
    perfMonitor.mark('rag-query-start');

    try {
      // Get provider
      const provider = this.providers.get(params.provider || this.currentProvider);
      if (!provider) {
        throw new Error(`Provider ${params.provider || this.currentProvider} not available`);
      }

      // Step 1: Embed query
      perfMonitor.mark('embed-query-start');
      const queryEmbedding = await this.embedQuery(params.query);
      perfMonitor.mark('embed-query-end');
      perfMonitor.measure('Query Embedding', 'embed-query-start', 'embed-query-end');

      // Step 2: Search similar chunks
      perfMonitor.mark('search-start');
      const chunks = await this.searchSimilarChunks(
        queryEmbedding,
        params.folderId,
        params.topK || 5,
        params.threshold || 0.5
      );
      perfMonitor.mark('search-end');
      perfMonitor.measure('Vector Search', 'search-start', 'search-end');

      if (chunks.length === 0) {
        return {
          answer: 'Xin lỗi, tôi không tìm thấy thông tin liên quan trong tài liệu. Vui lòng thử lại với câu hỏi khác hoặc upload thêm tài liệu.',
          sources: [],
          model: provider.getModel(),
          provider: provider.getProvider(),
          processingTime: Date.now() - startTime,
        };
      }

      // Step 3: Build context and generate response
      perfMonitor.mark('generate-start');

      if (params.stream) {
        // Streaming not directly supported in this method
        // Use queryStream instead
        throw new Error('Use queryStream() for streaming responses');
      }

      const answer = await this.generateResponse(provider, params.query, chunks);

      perfMonitor.mark('generate-end');
      perfMonitor.measure('AI Generation', 'generate-start', 'generate-end');

      perfMonitor.mark('rag-query-end');
      perfMonitor.measure('Total RAG Query', 'rag-query-start', 'rag-query-end');

      return {
        answer,
        sources: chunks,
        model: provider.getModel(),
        provider: provider.getProvider(),
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('[RAG] Query failed:', error);

      return {
        answer: '',
        sources: [],
        model: '',
        provider: params.provider || this.currentProvider,
        error: error.message || 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Streaming RAG query
   */
  async queryStream(params: RAGQuery, onChunk: StreamCallback): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      const provider = this.providers.get(params.provider || this.currentProvider);
      if (!provider) {
        throw new Error(`Provider ${params.provider || this.currentProvider} not available`);
      }

      // Embed and search (same as non-streaming)
      const queryEmbedding = await this.embedQuery(params.query);
      const chunks = await this.searchSimilarChunks(
        queryEmbedding,
        params.folderId,
        params.topK || 5,
        params.threshold || 0.5
      );

      if (chunks.length === 0) {
        const noResultMessage =
          'Xin lỗi, tôi không tìm thấy thông tin liên quan trong tài liệu. Vui lòng thử lại với câu hỏi khác.';

        onChunk({
          content: noResultMessage,
          done: true,
        });

        return {
          answer: noResultMessage,
          sources: [],
          model: provider.getModel(),
          provider: provider.getProvider(),
          processingTime: Date.now() - startTime,
        };
      }

      // Generate response with streaming
      let fullAnswer = '';

      await provider.streamComplete(
        {
          messages: this.buildRAGMessages(params.query, chunks),
        },
        (chunk) => {
          if (chunk.content) {
            fullAnswer += chunk.content;
          }
          onChunk(chunk);
        }
      );

      return {
        answer: fullAnswer,
        sources: chunks,
        model: provider.getModel(),
        provider: provider.getProvider(),
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('[RAG] Stream query failed:', error);

      const errorMessage = `Lỗi: ${error.message || 'Unknown error'}`;

      onChunk({
        content: errorMessage,
        done: true,
      });

      return {
        answer: '',
        sources: [],
        model: '',
        provider: params.provider || this.currentProvider,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Embed query with caching
   */
  private async embedQuery(query: string): Promise<number[]> {
    // Check cache first
    const cached = embeddingCache.get(query);
    if (cached) {
      console.log('[RAG] Using cached embedding for query');
      return cached;
    }

    // Generate new embedding (using default model 'Xenova/all-MiniLM-L6-v2')
    const embedding = await generateEmbedding(query, 'Xenova/all-MiniLM-L6-v2');

    // Cache for future use
    embeddingCache.set(query, embedding);

    return embedding;
  }

  /**
   * Search similar chunks from database
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    folderId?: string,
    topK: number = 5,
    threshold: number = 0.5
  ): Promise<RetrievedChunk[]> {
    try {
      // Get all chunks (filtered by folder if specified)
      const allChunks = folderId
        ? await ChunkStorage.getByFolders([folderId])
        : await ChunkStorage.getAll();

      if (allChunks.length === 0) {
        console.warn('[RAG] No chunks found in database');
        return [];
      }

      // Calculate similarities
      const chunksWithSimilarity = allChunks.map((chunk) => ({
        ...chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      // Filter by threshold and sort
      const relevantChunks = chunksWithSimilarity
        .filter((chunk) => chunk.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      // Convert to RetrievedChunk format
      return relevantChunks.map((chunk, index) => ({
        content: chunk.text, // VectorChunk uses 'text' property
        documentName: chunk.documentName,
        documentId: chunk.documentId,
        similarity: chunk.similarity,
        chunkIndex: index, // Use array index as chunk index
      }));
    } catch (error) {
      console.error('[RAG] Failed to search chunks:', error);
      return [];
    }
  }

  /**
   * Generate response using AI provider
   */
  private async generateResponse(
    provider: BaseAIProvider,
    query: string,
    chunks: RetrievedChunk[]
  ): Promise<string> {
    const messages = this.buildRAGMessages(query, chunks);

    const response = await provider.complete({ messages });

    return response.content;
  }

  /**
   * Build messages for RAG context
   */
  private buildRAGMessages(query: string, chunks: RetrievedChunk[]) {
    // Format context
    const context = chunks
      .map(
        (chunk, idx) =>
          `[Tài liệu ${idx + 1}: ${chunk.documentName} - Độ liên quan: ${(chunk.similarity * 100).toFixed(1)}%]
${chunk.content}
---`
      )
      .join('\n\n');

    return [
      {
        role: 'system' as const,
        content: `Bạn là trợ lý AI chuyên trả lời câu hỏi dựa trên tài liệu kiến trúc và xây dựng.

NHIỆM VỤ:
- Trả lời câu hỏi của người dùng dựa HOÀN TOÀN trên nội dung tài liệu được cung cấp
- Trích dẫn chính xác các đoạn văn bản từ tài liệu
- Nếu không tìm thấy thông tin trong tài liệu, hãy thừa nhận và KHÔNG bịa đặt

NGUYÊN TẮC:
- Trả lời bằng tiếng Việt
- Câu trả lời ngắn gọn, súc tích
- Ưu tiên độ chính xác hơn là chi tiết
- Luôn trích dẫn tên tài liệu nguồn

CONTEXT TỪ TÀI LIỆU:
${context}`,
      },
      {
        role: 'user' as const,
        content: query,
      },
    ];
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);

    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get health status of all providers
   */
  async checkProvidersHealth(): Promise<Map<AIProvider, boolean>> {
    const health = new Map<AIProvider, boolean>();

    for (const [providerName, provider] of this.providers.entries()) {
      try {
        const status = await provider.healthCheck();
        health.set(providerName, status.available);
      } catch (error) {
        health.set(providerName, false);
      }
    }

    return health;
  }
}
