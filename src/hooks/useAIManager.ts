/**
 * React Hook for AI Manager
 * Provides easy access to AI providers and RAG engine
 */

import { useState, useEffect, useCallback } from 'react';
import { RAGEngine } from '../services/ai/ragEngine';
import { AIProviderManager } from '../services/ai/providerManager';
import { OpenAIProvider } from '../services/ai/providers/openai';
import { GeminiProvider } from '../services/ai/providers/gemini';
import { OllamaProvider } from '../services/ai/providers/ollama';
import type {
    RAGQuery,
    RAGResponse,
    StreamCallback,
    AIProvider,
    ProviderStatus
} from '../services/ai/types';

export function useAIManager() {
    const [ragEngine] = useState(() => new RAGEngine());
    const [providerManager] = useState(() => new AIProviderManager());
    const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');
    const [isInitialized, setIsInitialized] = useState(false);
    const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);

    // Initialize providers
    useEffect(() => {
        const initProviders = async () => {
            try {
                // Register providers based on environment variables
                const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
                if (openaiKey) {
                    const openai = new OpenAIProvider({
                        apiKey: openaiKey,
                        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
                    });
                    ragEngine.registerProvider(openai);
                    providerManager.registerProvider(openai);
                    console.log('[AI] OpenAI provider registered');
                }

                const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (geminiKey) {
                    const gemini = new GeminiProvider({
                        apiKey: geminiKey,
                        model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash-latest',
                    });
                    ragEngine.registerProvider(gemini);
                    providerManager.registerProvider(gemini);
                    console.log('[AI] Gemini provider registered');
                }

                // Always try to register Ollama (will fail gracefully if not running)
                try {
                    const ollama = new OllamaProvider({
                        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
                        model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1',
                    });
                    ragEngine.registerProvider(ollama);
                    providerManager.registerProvider(ollama);
                    console.log('[AI] Ollama provider registered');
                } catch (error) {
                    console.warn('[AI] Ollama registration failed:', error);
                }

                // Set default provider
                const defaultProvider = (import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'gemini') as AIProvider;
                ragEngine.setProvider(defaultProvider);
                providerManager.setProvider(defaultProvider);
                setCurrentProvider(defaultProvider);

                // Check provider statuses
                const statuses = await providerManager.getAvailableProviders();
                setProviderStatuses(statuses);

                setIsInitialized(true);
            } catch (error) {
                console.error('[AI] Provider initialization failed:', error);
            }
        };

        initProviders();
    }, [ragEngine, providerManager]);

    // Query RAG system
    const query = useCallback(
        async (params: RAGQuery): Promise<RAGResponse> => {
            if (!isInitialized) {
                throw new Error('AI Manager not initialized');
            }

            return await ragEngine.query(params);
        },
        [ragEngine, isInitialized]
    );

    // Query with streaming
    const queryStream = useCallback(
        async (params: RAGQuery, onChunk: StreamCallback): Promise<RAGResponse> => {
            if (!isInitialized) {
                throw new Error('AI Manager not initialized');
            }

            return await ragEngine.queryStream(params, onChunk);
        },
        [ragEngine, isInitialized]
    );

    // Switch provider
    const switchProvider = useCallback(
        (provider: AIProvider) => {
            try {
                ragEngine.setProvider(provider);
                providerManager.setProvider(provider);
                setCurrentProvider(provider);
            } catch (error) {
                console.error('[AI] Failed to switch provider:', error);
            }
        },
        [ragEngine, providerManager]
    );

    // Get provider statuses
    const checkProviderStatuses = useCallback(async () => {
        if (!isInitialized) return [];

        const statuses = await providerManager.getAvailableProviders();
        setProviderStatuses(statuses);
        return statuses;
    }, [providerManager, isInitialized]);

    // Get available providers
    const getAvailableProviders = useCallback(() => {
        return providerManager.getAllProviders().map(provider => provider.getProvider());
    }, [providerManager]);

    return {
        query,
        queryStream,
        currentProvider,
        switchProvider,
        isInitialized,
        providerStatuses,
        checkProviderStatuses,
        getAvailableProviders,
    };
}