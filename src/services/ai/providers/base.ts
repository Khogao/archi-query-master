/**
 * Base AI Provider Interface
 * Abstract class that all AI providers must implement
 */

import type {
  AIProvider,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  StreamCallback,
  StreamChunk,
  ProviderStatus,
} from '../types';
import { AIServiceError } from '../types';

/**
 * Abstract base class for all AI providers
 * Ensures consistent interface across OpenAI, Gemini, Ollama, etc.
 */
export abstract class BaseAIProvider {
  protected provider: AIProvider;
  protected model: string;
  protected apiKey?: string;
  protected baseUrl?: string;
  protected maxTokens: number;
  protected temperature: number;
  protected timeout: number;

  constructor(
    provider: AIProvider,
    config: {
      model: string;
      apiKey?: string;
      baseUrl?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
    }
  ) {
    this.provider = provider;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.maxTokens = config.maxTokens ?? 2000;
    this.temperature = config.temperature ?? 0.7;
    this.timeout = config.timeout ?? 30000; // 30s default
  }

  /**
   * Generate completion from messages
   * Main method for getting AI responses
   */
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate streaming completion
   * Returns chunks of text as they're generated
   */
  abstract streamComplete(
    request: CompletionRequest,
    onChunk: StreamCallback
  ): Promise<void>;

  /**
   * Check if provider is available and healthy
   */
  abstract healthCheck(): Promise<ProviderStatus>;

  /**
   * Get provider name
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update model
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Build system message for RAG context
   */
  protected buildRAGSystemMessage(context: string, query: string): ChatMessage {
    return {
      role: 'system',
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
${context}

CÂU HỎI CỦA NGƯỜI DÙNG:
${query}`,
    };
  }

  /**
   * Format retrieved chunks into context string
   */
  protected formatContext(chunks: Array<{ content: string; documentName: string; similarity: number }>): string {
    return chunks
      .map(
        (chunk, idx) =>
          `[Tài liệu ${idx + 1}: ${chunk.documentName} - Độ liên quan: ${(chunk.similarity * 100).toFixed(1)}%]
${chunk.content}
---`
      )
      .join('\n\n');
  }

  /**
   * Estimate token count (rough approximation)
   * More accurate counting should use tiktoken or equivalent
   */
  protected estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    // For Vietnamese: 1 token ≈ 2-3 characters (use 2.5)
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      text
    );
    const charPerToken = isVietnamese ? 2.5 : 4;
    return Math.ceil(text.length / charPerToken);
  }

  /**
   * Handle errors consistently across providers
   */
  protected handleError(error: any, operation: string): never {
    console.error(`[${this.provider}] Error in ${operation}:`, error);

    // Extract meaningful error message
    let message = error.message || 'Unknown error';
    let statusCode = error.statusCode || error.status || 500;

    if (error.response) {
      message = error.response.data?.error?.message || message;
      statusCode = error.response.status || statusCode;
    }

    throw new AIServiceError(
      `${this.provider} ${operation} failed: ${message}`,
      this.provider,
      error.code,
      statusCode
    );
  }

  /**
   * Validate API key exists
   */
  protected requireApiKey(): void {
    if (!this.apiKey) {
      throw new AIServiceError(
        `API key required for ${this.provider}`,
        this.provider,
        'MISSING_API_KEY',
        401
      );
    }
  }

  /**
   * Create abort controller with timeout
   */
  protected createAbortController(): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    return {
      signal: controller.signal,
      cancel: () => {
        clearTimeout(timeoutId);
        controller.abort();
      },
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors or client errors (4xx except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`[${this.provider}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Sanitize messages (remove empty content, ensure proper structure)
   */
  protected sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
        timestamp: msg.timestamp || Date.now(),
      }));
  }

  /**
   * Truncate context to fit within token limit
   */
  protected truncateContext(context: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(context);

    if (estimatedTokens <= maxTokens) {
      return context;
    }

    // Truncate to approximately maxTokens
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      context
    );
    const charPerToken = isVietnamese ? 2.5 : 4;
    const targetLength = Math.floor(maxTokens * charPerToken);

    return context.slice(0, targetLength) + '\n\n[... nội dung đã bị cắt bớt do vượt quá giới hạn ...]';
  }
}
