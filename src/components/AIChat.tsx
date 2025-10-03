/**
 * AI Chat Component
 * Provides a chat interface for querying documents with AI
 */

import { useState, useRef, useEffect } from 'react';
import { useAIManager } from '../hooks/useAIManager';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, Send, Bot } from 'lucide-react';
import type { AIProvider } from '../services/ai/types';

export function AIChat() {
    const {
        query,
        queryStream,
        currentProvider,
        switchProvider,
        isInitialized,
        providerStatuses,
        getAvailableProviders
    } = useAIManager();

    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streaming, setStreaming] = useState(true);
    const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const handleAsk = async () => {
        if (!question.trim() || isLoading) return;

        // Add user question to conversation
        const userMessage = { role: 'user' as const, content: question };
        setConversation(prev => [...prev, userMessage]);
        setQuestion('');
        setIsLoading(true);
        setAnswer('');

        try {
            if (streaming) {
                // Streaming mode
                let fullAnswer = '';

                await queryStream(
                    {
                        query: question,
                        stream: true,
                    },
                    (chunk) => {
                        if (chunk.content) {
                            fullAnswer += chunk.content;
                            setAnswer(fullAnswer);
                        }
                    }
                );

                // Add assistant response to conversation
                setConversation(prev => [...prev, { role: 'assistant', content: fullAnswer }]);
            } else {
                // Normal mode
                const response = await query({
                    query: question,
                    stream: false,
                });

                // Add assistant response to conversation
                setConversation(prev => [...prev, { role: 'assistant', content: response.answer }]);
                setAnswer(response.answer);
            }
        } catch (error: any) {
            const errorMessage = `❌ Lỗi: ${error.message || 'Unknown error'}`;
            setAnswer(errorMessage);
            setConversation(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProviderChange = (provider: AIProvider) => {
        switchProvider(provider);
    };

    const availableProviders = getAvailableProviders();

    if (!isInitialized) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Đang khởi tạo hệ thống AI...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center">
                    <Bot className="mr-2 h-6 w-6" />
                    Trợ lý AI
                </h2>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Nhà cung cấp:</span>
                    <Select value={currentProvider} onValueChange={handleProviderChange}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableProviders.map(provider => (
                                <SelectItem key={provider} value={provider}>
                                    <div className="flex items-center">
                                        <span className="capitalize">{provider}</span>
                                        {providerStatuses.find(p => p.provider === provider)?.available ? (
                                            <Badge variant="secondary" className="ml-2">Online</Badge>
                                        ) : (
                                            <Badge variant="outline" className="ml-2">Offline</Badge>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-4">
                {/* Conversation history */}
                <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {conversation.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Bắt đầu cuộc trò chuyện bằng cách đặt câu hỏi...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {conversation.map((message, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg ${message.role === 'user'
                                            ? 'bg-blue-100 ml-8'
                                            : 'bg-green-100 mr-8'
                                        }`}
                                >
                                    <div className="font-semibold mb-1">
                                        {message.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                                    </div>
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                </div>
                            ))}
                            {isLoading && answer && (
                                <div className="p-3 rounded-lg bg-green-100 mr-8">
                                    <div className="font-semibold mb-1">Trợ lý AI</div>
                                    <div className="whitespace-pre-wrap">{answer}</div>
                                    <Loader2 className="h-4 w-4 animate-spin mt-2" />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Question Input */}
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Đặt câu hỏi về tài liệu..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAsk();
                            }
                        }}
                        rows={3}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleAsk}
                        disabled={isLoading || !question.trim()}
                        className="h-auto"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={streaming}
                            onChange={(e) => setStreaming(e.target.checked)}
                        />
                        Phản hồi thời gian thực
                    </label>

                    <div className="text-sm text-gray-600">
                        Nhà cung cấp hiện tại: <span className="font-semibold capitalize">{currentProvider}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}