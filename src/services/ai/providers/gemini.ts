/**
 * Google Gemini Provider Implementation
 * Supports Gemini 1.5 Flash, Gemini 1.5 Pro
 * FREE tier: 15 requests/minute, 1M tokens/minute
 */

import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { BaseAIProvider } from './base';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  StreamCallback,
  ProviderStatus,
} from '../types';
import { AuthenticationError, RateLimitError } from '../types';

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    super('gemini', {
      model: config.model || 'gemini-1.5-flash-latest',
      apiKey: config.apiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout,
    });

    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Generate completion using Gemini API
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.requireApiKey();

    try {
      const messages = this.sanitizeMessages(request.messages);

      // Gemini uses a different format - combine messages into prompt
      const prompt = this.formatMessagesForGemini(messages);

      const model = this.client.getGenerativeModel({
        model: request.model || this.model,
        generationConfig: {
          maxOutputTokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
        },
      });

      const result: GenerateContentResult = await this.retry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response;
      const text = response.text();

      // Estimate tokens (Gemini doesn't always provide usage info)
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(text);

      return {
        content: text,
        model: this.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
      };
    } catch (error: any) {
      // Handle Gemini-specific errors
      if (error.status === 400 && error.message?.includes('API_KEY')) {
        throw new AuthenticationError('gemini');
      }
      if (error.status === 429) {
        throw new RateLimitError('gemini');
      }

      return this.handleError(error, 'complete');
    }
  }

  /**
   * Stream completion using Gemini API
   */
  async streamComplete(request: CompletionRequest, onChunk: StreamCallback): Promise<void> {
    this.requireApiKey();

    try {
      const messages = this.sanitizeMessages(request.messages);
      const prompt = this.formatMessagesForGemini(messages);

      const model = this.client.getGenerativeModel({
        model: request.model || this.model,
        generationConfig: {
          maxOutputTokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
        },
      });

      const result = await this.retry(async () => {
        return await model.generateContentStream(prompt);
      });

      // Stream chunks
      for await (const chunk of result.stream) {
        const text = chunk.text();

        if (text) {
          onChunk({
            content: text,
            done: false,
            model: this.model,
          });
        }
      }

      // Send final done signal
      onChunk({
        content: '',
        done: true,
        model: this.model,
      });
    } catch (error: any) {
      if (error.status === 400 && error.message?.includes('API_KEY')) {
        throw new AuthenticationError('gemini');
      }
      if (error.status === 429) {
        throw new RateLimitError('gemini');
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
      const model = this.client.getGenerativeModel({ model: this.model });

      await model.generateContent('Hi');

      return {
        provider: 'gemini',
        available: true,
        latency: Date.now() - startTime,
        lastChecked: Date.now(),
      };
    } catch (error: any) {
      return {
        provider: 'gemini',
        available: false,
        error: error.message || 'Unknown error',
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Format messages for Gemini (combine into single prompt)
   */
  private formatMessagesForGemini(messages: ChatMessage[]): string {
    return messages
      .map((msg) => {
        switch (msg.role) {
          case 'system':
            return `System Instructions:\n${msg.content}`;
          case 'user':
            return `User: ${msg.content}`;
          case 'assistant':
            return `Assistant: ${msg.content}`;
          default:
            return msg.content;
        }
      })
      .join('\n\n');
  }

  /**
   * Map Gemini finish reasons to standard format
   */
  private mapFinishReason(reason?: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
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
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ];
  }

  /**
   * Estimate cost for tokens (Gemini pricing)
   */
  static estimateCost(promptTokens: number, completionTokens: number): number {
    // Gemini 1.5 Flash pricing (paid tier)
    const inputCost = 0.075; // per 1M tokens
    const outputCost = 0.3; // per 1M tokens

    return (promptTokens * inputCost + completionTokens * outputCost) / 1_000_000;
  }
}
