/**
 * AI Provider Manager
 * Manages multiple AI providers with fallback logic and health checking
 */

import { BaseAIProvider } from './providers/base';
import type { AIProvider, ProviderStatus, AIModelConfig } from './types';

export class AIProviderManager {
    private providers: Map<AIProvider, BaseAIProvider>;
    private currentProvider: AIProvider;
    private fallbackOrder: AIProvider[];
    private enableAutoFallback: boolean;

    constructor(initialProvider: AIProvider = 'gemini') {
        this.providers = new Map();
        this.currentProvider = initialProvider;
        this.fallbackOrder = ['gemini', 'openai', 'ollama'];
        this.enableAutoFallback = true;
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
     * Set fallback order
     */
    setFallbackOrder(order: AIProvider[]): void {
        this.fallbackOrder = order;
    }

    /**
     * Enable/disable auto fallback
     */
    setAutoFallback(enabled: boolean): void {
        this.enableAutoFallback = enabled;
    }

    /**
     * Get current provider
     */
    getCurrentProvider(): BaseAIProvider | undefined {
        return this.providers.get(this.currentProvider);
    }

    /**
     * Get provider by name
     */
    getProvider(name: AIProvider): BaseAIProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Get all registered providers
     */
    getAllProviders(): BaseAIProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Get available providers (health checked)
     */
    async getAvailableProviders(): Promise<ProviderStatus[]> {
        const statuses: ProviderStatus[] = [];

        for (const provider of this.providers.values()) {
            try {
                const status = await provider.healthCheck();
                statuses.push(status);
            } catch (error) {
                statuses.push({
                    provider: provider.getProvider(),
                    available: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    lastChecked: Date.now(),
                });
            }
        }

        return statuses;
    }

    /**
     * Execute function with fallback logic
     */
    async executeWithFallback<T>(
        fn: (provider: BaseAIProvider) => Promise<T>,
        preferredProvider?: AIProvider
    ): Promise<T> {
        const providerToUse = preferredProvider || this.currentProvider;
        const provider = this.providers.get(providerToUse);

        if (!provider) {
            throw new Error(`Provider ${providerToUse} not available`);
        }

        try {
            // Try with preferred provider first
            return await fn(provider);
        } catch (error) {
            console.warn(`Provider ${providerToUse} failed:`, error);

            // If auto fallback is disabled, re-throw the error
            if (!this.enableAutoFallback) {
                throw error;
            }

            // Try fallback providers in order
            for (const fallbackProviderName of this.fallbackOrder) {
                // Skip the provider that already failed
                if (fallbackProviderName === providerToUse) continue;

                const fallbackProvider = this.providers.get(fallbackProviderName);
                if (!fallbackProvider) continue;

                try {
                    console.log(`Trying fallback provider: ${fallbackProviderName}`);
                    return await fn(fallbackProvider);
                } catch (fallbackError) {
                    console.warn(`Fallback provider ${fallbackProviderName} also failed:`, fallbackError);
                    // Continue to next fallback provider
                }
            }

            // If all providers failed, re-throw the original error
            throw error;
        }
    }

    /**
     * Get provider configuration
     */
    getProviderConfig(provider: AIProvider): AIModelConfig | null {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance) return null;

        return {
            provider,
            model: providerInstance.getModel(),
            apiKey: providerInstance['apiKey'], // This might not be accessible depending on implementation
            baseUrl: providerInstance['baseUrl'], // This might not be accessible depending on implementation
        };
    }

    /**
     * Update provider configuration
     */
    updateProviderConfig(provider: AIProvider, config: Partial<AIModelConfig>): void {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance) {
            throw new Error(`Provider ${provider} not registered`);
        }

        if (config.model) {
            providerInstance.setModel(config.model);
        }

        if (config.apiKey) {
            providerInstance.setApiKey(config.apiKey);
        }
    }
}