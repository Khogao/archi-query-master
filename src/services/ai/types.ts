/**
 * AI Service Types & Interfaces
 * Defines all TypeScript types for AI providers and RAG system
 */

// ============================================================================
// AI Provider Types
// ============================================================================

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'gemini' | 'ollama' | 'anthropic' | 'groq';

/**
 * AI model configuration for each provider
 */
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * AI completion request
 */
export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * AI completion response
 */
export interface CompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error';
  error?: string;
}

/**
 * Streaming chunk from AI provider
 */
export interface StreamChunk {
  content: string;
  done: boolean;
  model?: string;
}

// ============================================================================
// RAG Types
// ============================================================================

/**
 * RAG query request
 */
export interface RAGQuery {
  query: string;
  folderId?: string;
  topK?: number;          // Number of chunks to retrieve
  threshold?: number;     // Similarity threshold
  provider?: AIProvider;
  stream?: boolean;
}

/**
 * Retrieved context chunk
 */
export interface RetrievedChunk {
  content: string;
  documentName: string;
  documentId: string;
  similarity: number;
  chunkIndex: number;
}

/**
 * RAG context for LLM
 */
export interface RAGContext {
  query: string;
  chunks: RetrievedChunk[];
  systemPrompt: string;
}

/**
 * RAG response
 */
export interface RAGResponse {
  answer: string;
  sources: RetrievedChunk[];
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime?: number;
  error?: string;
}

// ============================================================================
// Provider Status & Health
// ============================================================================

/**
 * Provider availability status
 */
export interface ProviderStatus {
  provider: AIProvider;
  available: boolean;
  latency?: number;        // ms
  error?: string;
  lastChecked: number;
}

/**
 * Provider usage statistics
 */
export interface ProviderUsage {
  provider: AIProvider;
  requestCount: number;
  totalTokens: number;
  estimatedCost: number;   // USD
  lastUsed?: number;
}

// ============================================================================
// Configuration & Settings
// ============================================================================

/**
 * AI provider settings stored in IndexedDB
 */
export interface AIProviderSettings {
  id: string;
  defaultProvider: AIProvider;
  providers: {
    openai?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    gemini?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    ollama?: {
      baseUrl: string;
      model: string;
      enabled: boolean;
    };
    anthropic?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    groq?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
  };
  fallbackOrder: AIProvider[];  // Fallback sequence if primary fails
  enableAutoFallback: boolean;
  maxRetries: number;
  timeout: number;              // ms
}

/**
 * RAG system settings
 */
export interface RAGSettings {
  id: string;
  defaultTopK: number;           // Default number of chunks to retrieve
  defaultThreshold: number;      // Default similarity threshold
  maxContextLength: number;      // Max tokens for context
  systemPrompt: string;          // System prompt template
  enableSourceCitation: boolean; // Include source references
  enableStreaming: boolean;      // Stream responses
  chunkOverlap: number;          // Overlap between chunks
  embeddingModel: string;        // Model for embeddings
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * AI service errors
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AIServiceError {
  constructor(
    provider: AIProvider,
    public retryAfter?: number  // seconds
  ) {
    super('Rate limit exceeded', provider, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AIServiceError {
  constructor(provider: AIProvider) {
    super('Authentication failed - invalid API key', provider, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends AIServiceError {
  constructor(provider: AIProvider, reason?: string) {
    super(
      `Provider ${provider} is unavailable${reason ? `: ${reason}` : ''}`,
      provider,
      'PROVIDER_UNAVAILABLE',
      503
    );
    this.name = 'ProviderUnavailableError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Stream callback for real-time responses
 */
export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Provider health check function
 */
export type HealthCheckFn = () => Promise<ProviderStatus>;

/**
 * Cost estimation per provider (USD per 1M tokens)
 */
export const PROVIDER_COSTS: Record<AIProvider, { input: number; output: number }> = {
  openai: { input: 0.15, output: 0.60 },      // GPT-4o-mini
  gemini: { input: 0.075, output: 0.30 },     // Gemini 1.5 Flash (paid tier)
  ollama: { input: 0, output: 0 },            // Free (local)
  anthropic: { input: 0.25, output: 1.25 },   // Claude Haiku
  groq: { input: 0, output: 0 },              // Free tier
};

/**
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash-latest',
  ollama: 'llama3.1',
  anthropic: 'claude-3-haiku-20240307',
  groq: 'llama-3.1-70b-versatile',
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: 'OpenAI GPT',
  gemini: 'Google Gemini',
  ollama: 'Ollama (Local)',
  anthropic: 'Anthropic Claude',
  groq: 'Groq',
};
