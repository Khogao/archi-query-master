/**
 * OpenAI Provider Implementation
 * Supports GPT-4o, GPT-4o-mini, GPT-3.5-turbo
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import type {
  CompletionRequest,
  CompletionResponse,
  StreamCallback,
  ProviderStatus,
} from '../types';
import { AuthenticationError, RateLimitError } from '../types';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    super('openai', {
      model: config.model || 'gpt-4o-mini',
      apiKey: config.apiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout,
    });

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: this.timeout,
      dangerouslyAllowBrowser: true, // For React app
    });
  }

  /**
   * Generate completion using OpenAI Chat API
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.requireApiKey();

    try {
      const messages = this.sanitizeMessages(request.messages);

      const completion = await this.retry(async () => {
        return await this.client.chat.completions.create({
          model: request.model || this.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          stream: false,
        });
      });

      const choice = completion.choices[0];

      return {
        content: choice.message.content || '',
        model: completion.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error.status === 401) {
        throw new AuthenticationError('openai');
      }
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        throw new RateLimitError('openai', retryAfter ? parseInt(retryAfter) : undefined);
      }

      return this.handleError(error, 'complete');
    }
  }

  /**
   * Stream completion using OpenAI Chat API
   */
  async streamComplete(request: CompletionRequest, onChunk: StreamCallback): Promise<void> {
    this.requireApiKey();

    try {
      const messages = this.sanitizeMessages(request.messages);

      const stream = await this.retry(async () => {
        return await this.client.chat.completions.create({
          model: request.model || this.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          stream: true,
        });
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';

        if (content) {
          onChunk({
            content,
            done: false,
            model: chunk.model,
          });
        }

        // Check if done
        if (chunk.choices[0]?.finish_reason) {
          onChunk({
            content: '',
            done: true,
            model: chunk.model,
          });
          break;
        }
      }
    } catch (error: any) {
      if (error.status === 401) {
        throw new AuthenticationError('openai');
      }
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        throw new RateLimitError('openai', retryAfter ? parseInt(retryAfter) : undefined);
      }

      this.handleError(error, 'streamComplete');
    }
  }

  /**
   * Health check - verify API key and connectivity
   */
  async healthCheck(): Promise<ProviderStatus> {
    const startTime = Date.now();

    try {
      // Simple completion to test connectivity
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });

      return {
        provider: 'openai',
        available: true,
        latency: Date.now() - startTime,
        lastChecked: Date.now(),
      };
    } catch (error: any) {
      return {
        provider: 'openai',
        available: false,
        error: error.message || 'Unknown error',
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Map OpenAI finish reasons to standard format
   */
  private mapFinishReason(reason: string | null): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * Get available models
   */
  static getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
  }

  /**
   * Estimate cost for tokens
   */
  static estimateCost(promptTokens: number, completionTokens: number, model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    const cost = pricing[model] || pricing['gpt-4o-mini'];

    // Cost is per 1M tokens, convert to actual cost
    return (promptTokens * cost.input + completionTokens * cost.output) / 1_000_000;
  }
}
