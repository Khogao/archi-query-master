/**
 * Ollama Provider Implementation
 * Local AI models - FREE, Privacy-focused
 * Supports: Llama 3.1, Qwen 2, Gemma 2, Mistral, etc.
 */

import { BaseAIProvider } from './base';
import type {
  CompletionRequest,
  CompletionResponse,
  StreamCallback,
  ProviderStatus,
  ChatMessage,
} from '../types';
import { ProviderUnavailableError } from '../types';

export class OllamaProvider extends BaseAIProvider {
  private ollamaBaseUrl: string;

  constructor(config: {
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    super('ollama', {
      model: config.model || 'llama3.1',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout,
    });

    this.ollamaBaseUrl = config.baseUrl || 'http://localhost:11434';
  }

  /**
   * Generate completion using Ollama API
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const messages = this.sanitizeMessages(request.messages);

      const response = await this.retry(async () => {
        const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model || this.model,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            stream: false,
            options: {
              num_predict: request.maxTokens || this.maxTokens,
              temperature: request.temperature ?? this.temperature,
            },
          }),
          signal: this.createAbortController().signal,
        });

        if (!res.ok) {
          throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
        }

        return await res.json();
      });

      return {
        content: response.message?.content || '',
        model: response.model || this.model,
        usage: {
          promptTokens: response.prompt_eval_count || 0,
          completionTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
        },
        finishReason: response.done ? 'stop' : 'length',
      };
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ProviderUnavailableError('ollama', 'Cannot connect to Ollama. Is it running?');
      }

      return this.handleError(error, 'complete');
    }
  }

  /**
   * Stream completion using Ollama API
   */
  async streamComplete(request: CompletionRequest, onChunk: StreamCallback): Promise<void> {
    try {
      const messages = this.sanitizeMessages(request.messages);

      const response = await this.retry(async () => {
        return await fetch(`${this.ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model || this.model,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            stream: true,
            options: {
              num_predict: request.maxTokens || this.maxTokens,
              temperature: request.temperature ?? this.temperature,
            },
          }),
          signal: this.createAbortController().signal,
        });
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      // Read stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Split by newlines (Ollama sends JSON objects separated by newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep last incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const json = JSON.parse(line);

            if (json.message?.content) {
              onChunk({
                content: json.message.content,
                done: false,
                model: json.model || this.model,
              });
            }

            if (json.done) {
              onChunk({
                content: '',
                done: true,
                model: json.model || this.model,
              });
              return;
            }
          } catch (e) {
            console.warn('[Ollama] Failed to parse JSON:', line);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ProviderUnavailableError('ollama', 'Cannot connect to Ollama. Is it running?');
      }

      this.handleError(error, 'streamComplete');
    }
  }

  /**
   * Health check - verify Ollama is running
   */
  async healthCheck(): Promise<ProviderStatus> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check if model is available
      const modelAvailable = data.models?.some((m: any) => m.name.includes(this.model));

      return {
        provider: 'ollama',
        available: modelAvailable,
        latency: Date.now() - startTime,
        error: modelAvailable ? undefined : `Model ${this.model} not found. Run: ollama pull ${this.model}`,
        lastChecked: Date.now(),
      };
    } catch (error: any) {
      return {
        provider: 'ollama',
        available: false,
        error: error.message || 'Ollama not running',
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * List available models on local Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('[Ollama] Failed to list models:', error);
      return [];
    }
  }

  /**
   * Pull a model from Ollama library
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      console.log(`[Ollama] Successfully pulled model: ${modelName}`);
    } catch (error) {
      console.error('[Ollama] Failed to pull model:', error);
      throw error;
    }
  }

  /**
   * Get recommended models
   */
  static getRecommendedModels(): Array<{ name: string; description: string; size: string }> {
    return [
      {
        name: 'llama3.1:8b',
        description: 'Best general model, good Vietnamese support',
        size: '4.7GB',
      },
      {
        name: 'qwen2:7b',
        description: 'Best Vietnamese language model',
        size: '4.4GB',
      },
      {
        name: 'gemma2:9b',
        description: 'Fast, good quality, efficient',
        size: '5.4GB',
      },
      {
        name: 'mistral:7b',
        description: 'Good reasoning, fast',
        size: '4.1GB',
      },
      {
        name: 'llama3.1:70b',
        description: 'Best quality (requires 40GB+ RAM)',
        size: '40GB',
      },
    ];
  }

  /**
   * Estimate cost (always free for local)
   */
  static estimateCost(): number {
    return 0; // Free!
  }
}
